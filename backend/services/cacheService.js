import { executeQuery } from '../config/database.js';

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  maxKeys: 10000,
  cleanupInterval: 60000, // 1 minute
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  }
};

// In-memory cache (fallback when Redis is not available)
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupInterval);
  }

  set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    // Check if we need to evict keys
    if (this.cache.size >= CACHE_CONFIG.maxKeys) {
      this.evictLRU();
    }

    const item = {
      value,
      createdAt: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, item);
    this.stats.sets++;

    // Set expiration timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);

    return true;
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - item.createdAt > item.ttl * 1000) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.value;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
      
      // Clear timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
    }

    return deleted;
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.createdAt > item.ttl * 1000) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  getKeys() {
    return Array.from(this.cache.keys());
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Redis cache implementation
class RedisCache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  async connect() {
    try {
      if (!CACHE_CONFIG.redis.enabled) {
        throw new Error('Redis is disabled');
      }

      // Import Redis dynamically
      const Redis = await import('redis');
      
      this.client = Redis.createClient({
        host: CACHE_CONFIG.redis.host,
        port: CACHE_CONFIG.redis.port,
        password: CACHE_CONFIG.redis.password,
        db: CACHE_CONFIG.redis.db
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.connected = false;
        this.stats.errors++;
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.connected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Redis connection error:', error);
      this.connected = false;
      return false;
    }
  }

  async set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    try {
      if (!this.connected) {
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.connected) {
        return null;
      }

      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async delete(key) {
    try {
      if (!this.connected) {
        return false;
      }

      const result = await this.client.del(key);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async has(key) {
    try {
      if (!this.connected) {
        return false;
      }

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis has error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async clear() {
    try {
      if (!this.connected) {
        return false;
      }

      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Redis clear error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async getKeys(pattern = '*') {
    try {
      if (!this.connected) {
        return [];
      }

      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis getKeys error:', error);
      this.stats.errors++;
      return [];
    }
  }

  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
}

// Unified cache interface
class CacheService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.currentCache = this.memoryCache;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Try to connect to Redis
      const redisConnected = await this.redisCache.connect();
      
      if (redisConnected) {
        this.currentCache = this.redisCache;
        console.log('Using Redis cache');
      } else {
        console.log('Using memory cache (Redis unavailable)');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Cache initialization error:', error);
      this.currentCache = this.memoryCache;
      this.initialized = true;
      return false;
    }
  }

  async set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use namespace for keys to avoid conflicts
    const namespacedKey = `medibook:${key}`;
    return await this.currentCache.set(namespacedKey, value, ttl);
  }

  async get(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    const namespacedKey = `medibook:${key}`;
    return await this.currentCache.get(namespacedKey);
  }

  async delete(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    const namespacedKey = `medibook:${key}`;
    return await this.currentCache.delete(namespacedKey);
  }

  async has(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    const namespacedKey = `medibook:${key}`;
    return await this.currentCache.has(namespacedKey);
  }

  async clear() {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.currentCache.clear();
  }

  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    return {
      type: this.currentCache === this.redisCache ? 'redis' : 'memory',
      ...this.currentCache.getStats()
    };
  }

  async getKeys() {
    if (!this.initialized) {
      await this.initialize();
    }

    const keys = await this.currentCache.getKeys();
    // Remove namespace prefix
    return keys.map(key => key.replace('medibook:', ''));
  }

  async destroy() {
    if (this.memoryCache) {
      this.memoryCache.destroy();
    }
    
    if (this.redisCache) {
      await this.redisCache.disconnect();
    }
  }
}

// Global cache instance
const cache = new CacheService();

// Cache helper functions
export const cacheGet = async (key) => {
  return await cache.get(key);
};

export const cacheSet = async (key, value, ttl) => {
  return await cache.set(key, value, ttl);
};

export const cacheDelete = async (key) => {
  return await cache.delete(key);
};

export const cacheHas = async (key) => {
  return await cache.has(key);
};

export const cacheClear = async () => {
  return await cache.clear();
};

// Database query caching
export const cachedQuery = async (key, query, params = [], ttl = 300) => {
  try {
    // Try to get from cache first
    const cached = await cacheGet(key);
    
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await executeQuery(query, params);
    
    // Cache the result
    await cacheSet(key, result, ttl);
    
    return result;
  } catch (error) {
    console.error('Cached query error:', error);
    throw error;
  }
};

// Cache invalidation helpers
export const invalidateUserCache = async (userId) => {
  const patterns = [
    `user:${userId}`,
    `appointments:user:${userId}`,
    `notifications:user:${userId}`,
    `dashboard:user:${userId}`
  ];

  for (const pattern of patterns) {
    await cacheDelete(pattern);
  }
};

export const invalidateDoctorCache = async (doctorId) => {
  const patterns = [
    `doctor:${doctorId}`,
    `appointments:doctor:${doctorId}`,
    `calendar:doctor:${doctorId}`,
    `dashboard:doctor:${doctorId}`
  ];

  for (const pattern of patterns) {
    await cacheDelete(pattern);
  }
};

export const invalidateAppointmentCache = async (appointmentId) => {
  const patterns = [
    `appointment:${appointmentId}`,
    `appointments:*` // Invalidate all appointment caches
  ];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Get all keys matching pattern and delete them
      const keys = await cache.getKeys();
      const matchingKeys = keys.filter(key => key.startsWith(pattern.replace('*', '')));
      
      for (const key of matchingKeys) {
        await cacheDelete(key);
      }
    } else {
      await cacheDelete(pattern);
    }
  }
};

// Cache warming functions
export const warmUserCache = async (userId) => {
  try {
    // Cache user data
    const userQuery = 'SELECT id, firstName, lastName, email, phone, role FROM users WHERE id = ?';
    const user = await executeQuery(userQuery, [userId]);
    await cacheSet(`user:${userId}`, user[0], 600);

    // Cache user appointments
    const appointmentsQuery = `
      SELECT a.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.userId = ?
      ORDER BY a.date DESC, a.time DESC
      LIMIT 10
    `;
    const appointments = await executeQuery(appointmentsQuery, [userId]);
    await cacheSet(`appointments:user:${userId}`, appointments, 300);

    // Cache user notifications
    const notificationsQuery = `
      SELECT * FROM notifications 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT 20
    `;
    const notifications = await executeQuery(notificationsQuery, [userId]);
    await cacheSet(`notifications:user:${userId}`, notifications, 180);

    return true;
  } catch (error) {
    console.error('Warm user cache error:', error);
    return false;
  }
};

export const warmDoctorCache = async (doctorId) => {
  try {
    // Cache doctor data
    const doctorQuery = 'SELECT * FROM doctors WHERE id = ?';
    const doctor = await executeQuery(doctorQuery, [doctorId]);
    await cacheSet(`doctor:${doctorId}`, doctor[0], 600);

    // Cache doctor appointments
    const appointmentsQuery = `
      SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName, u.phone
      FROM appointments a
      JOIN users u ON a.userId = u.id
      WHERE a.doctorId = ?
      ORDER BY a.date DESC, a.time DESC
      LIMIT 20
    `;
    const appointments = await executeQuery(appointmentsQuery, [doctorId]);
    await cacheSet(`appointments:doctor:${doctorId}`, appointments, 300);

    return true;
  } catch (error) {
    console.error('Warm doctor cache error:', error);
    return false;
  }
};

// Cache middleware for Express
export const cacheMiddleware = (keyGenerator, ttl = 300) => {
  return async (req, res, next) => {
    try {
      // Generate cache key based on request
      const key = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : keyGenerator;

      // Try to get from cache
      const cached = await cacheGet(key);
      
      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          cacheSet(key, data, ttl);
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Initialize cache
export const initializeCache = async () => {
  return await cache.initialize();
};

// Get cache statistics
export const getCacheStats = async () => {
  return await cache.getStats();
};

// Export cache instance for advanced usage
export { cache };
