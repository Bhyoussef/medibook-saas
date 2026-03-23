import { executeQuery } from '../config/database.js';

// Default notification preferences
export const DEFAULT_PREFERENCES = {
  email: true,
  sms: true,
  push: true,
  inApp: true,
  appointmentReminders: true,
  marketingEmails: false,
  appointmentBooked: {
    email: true,
    sms: true,
    push: true,
    inApp: true
  },
  appointmentConfirmed: {
    email: true,
    sms: false,
    push: true,
    inApp: true
  },
  appointmentCancelled: {
    email: true,
    sms: true,
    push: true,
    inApp: true
  },
  appointmentReminder: {
    email: true,
    sms: true,
    push: true,
    inApp: true
  },
  systemUpdates: {
    email: false,
    sms: false,
    push: false,
    inApp: true
  },
  marketing: {
    email: false,
    sms: false,
    push: false,
    inApp: false
  }
};

// Get user notification preferences
export const getUserNotificationPreferences = async (userId) => {
  try {
    const query = `
      SELECT preferences, updatedAt
      FROM notification_preferences 
      WHERE userId = ?
    `;
    
    const result = await executeQuery(query, [userId]);
    
    if (result.length === 0) {
      // Return default preferences
      return {
        ...DEFAULT_PREFERENCES,
        isDefault: true
      };
    }
    
    // Parse JSON preferences and merge with defaults
    const savedPreferences = JSON.parse(result[0].preferences);
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...savedPreferences,
      isDefault: false,
      updatedAt: result[0].updatedAt
    };
    
    return mergedPreferences;
  } catch (error) {
    console.error('Get user notification preferences error:', error);
    throw error;
  }
};

// Update user notification preferences
export const updateUserNotificationPreferences = async (userId, preferences) => {
  try {
    // Validate preferences
    const validatedPreferences = validatePreferences(preferences);
    
    const query = `
      INSERT INTO notification_preferences (userId, preferences, updatedAt)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE
      preferences = VALUES(preferences),
      updatedAt = VALUES(updatedAt)
    `;
    
    await executeQuery(query, [userId, JSON.stringify(validatedPreferences)]);
    
    // Log preference change
    await logPreferenceChange(userId, validatedPreferences);
    
    return {
      success: true,
      preferences: validatedPreferences
    };
  } catch (error) {
    console.error('Update user notification preferences error:', error);
    throw error;
  }
};

// Validate notification preferences
export const validatePreferences = (preferences) => {
  const validated = { ...DEFAULT_PREFERENCES };
  
  // Validate global preferences
  const globalPrefs = ['email', 'sms', 'push', 'inApp', 'appointmentReminders', 'marketingEmails'];
  
  for (const pref of globalPrefs) {
    if (preferences.hasOwnProperty(pref) && typeof preferences[pref] === 'boolean') {
      validated[pref] = preferences[pref];
    }
  }
  
  // Validate category preferences
  const categories = ['appointmentBooked', 'appointmentConfirmed', 'appointmentCancelled', 'appointmentReminder', 'systemUpdates', 'marketing'];
  
  for (const category of categories) {
    if (preferences[category] && typeof preferences[category] === 'object') {
      validated[category] = {
        ...DEFAULT_PREFERENCES[category],
        ...preferences[category]
      };
    }
  }
  
  return validated;
};

// Check if user should receive notification type
export const shouldReceiveNotification = async (userId, notificationType, channel) => {
  try {
    const preferences = await getUserNotificationPreferences(userId);
    
    // Check global channel preference
    if (preferences[channel] === false) {
      return { shouldReceive: false, reason: `${channel} notifications disabled` };
    }
    
    // Check category-specific preference
    const categoryMap = {
      'appointment': 'appointmentBooked',
      'appointment_booked': 'appointmentBooked',
      'appointment_confirmed': 'appointmentConfirmed',
      'appointment_cancelled': 'appointmentCancelled',
      'reminder': 'appointmentReminder',
      'system': 'systemUpdates',
      'marketing': 'marketing'
    };
    
    const category = categoryMap[notificationType] || notificationType;
    
    if (preferences[category] && preferences[category][channel] === false) {
      return { shouldReceive: false, reason: `${category} ${channel} notifications disabled` };
    }
    
    return { shouldReceive: true };
  } catch (error) {
    console.error('Check notification preference error:', error);
    // Default to true if there's an error
    return { shouldReceive: true };
  }
};

// Get notification channels for user
export const getNotificationChannels = async (userId, notificationType) => {
  try {
    const preferences = await getUserNotificationPreferences(userId);
    const channels = [];
    
    // Check each channel
    const channelList = ['email', 'sms', 'push', 'inApp'];
    
    for (const channel of channelList) {
      const shouldReceive = await shouldReceiveNotification(userId, notificationType, channel);
      if (shouldReceive.shouldReceive) {
        channels.push(channel);
      }
    }
    
    return channels;
  } catch (error) {
    console.error('Get notification channels error:', error);
    throw error;
  }
};

// Get all users with specific notification preferences
export const getUsersByPreferences = async (filters) => {
  try {
    let query = `
      SELECT u.id, u.firstName, u.lastName, u.email, u.phone,
             np.preferences, np.updatedAt
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.userId
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by notification preferences
    if (filters.email !== undefined) {
      query += ` AND (np.preferences IS NULL OR JSON_EXTRACT(np.preferences, '$.email') = ?)`;
      params.push(filters.email);
    }
    
    if (filters.sms !== undefined) {
      query += ` AND (np.preferences IS NULL OR JSON_EXTRACT(np.preferences, '$.sms') = ?)`;
      params.push(filters.sms);
    }
    
    if (filters.push !== undefined) {
      query += ` AND (np.preferences IS NULL OR JSON_EXTRACT(np.preferences, '$.push') = ?)`;
      params.push(filters.push);
    }
    
    if (filters.marketingEmails !== undefined) {
      query += ` AND (np.preferences IS NULL OR JSON_EXTRACT(np.preferences, '$.marketingEmails') = ?)`;
      params.push(filters.marketingEmails);
    }
    
    // Filter by role
    if (filters.role) {
      query += ` AND u.role = ?`;
      params.push(filters.role);
    }
    
    // Filter by active users
    if (filters.active !== undefined) {
      query += ` AND u.isActive = ?`;
      params.push(filters.active);
    }
    
    query += ` ORDER BY u.lastName, u.firstName`;
    
    const users = await executeQuery(query, params);
    
    // Parse preferences for each user
    const usersWithPreferences = users.map(user => ({
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES
    }));
    
    return usersWithPreferences;
  } catch (error) {
    console.error('Get users by preferences error:', error);
    throw error;
  }
};

// Get notification preference statistics
export const getNotificationPreferenceStats = async () => {
  try {
    const stats = {};
    
    // Global preference stats
    const globalQuery = `
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.email') = true THEN 1 ELSE 0 END) as emailEnabled,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.sms') = true THEN 1 ELSE 0 END) as smsEnabled,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.push') = true THEN 1 ELSE 0 END) as pushEnabled,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.inApp') = true THEN 1 ELSE 0 END) as inAppEnabled,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentReminders') = true THEN 1 ELSE 0 END) as remindersEnabled,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.marketingEmails') = true THEN 1 ELSE 0 END) as marketingEnabled
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.userId
      WHERE u.isActive = TRUE
    `;
    
    const globalStats = await executeQuery(globalQuery);
    stats.global = globalStats[0];
    
    // Category-specific stats
    const categoryQuery = `
      SELECT 
        'appointmentBooked' as category,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentBooked.email') = true THEN 1 ELSE 0 END) as email,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentBooked.sms') = true THEN 1 ELSE 0 END) as sms,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentBooked.push') = true THEN 1 ELSE 0 END) as push,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentBooked.inApp') = true THEN 1 ELSE 0 END) as inApp
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.userId
      WHERE u.isActive = TRUE
      
      UNION ALL
      
      SELECT 
        'appointmentReminder' as category,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentReminder.email') = true THEN 1 ELSE 0 END) as email,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentReminder.sms') = true THEN 1 ELSE 0 END) as sms,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentReminder.push') = true THEN 1 ELSE 0 END) as push,
        SUM(CASE WHEN preferences IS NULL OR JSON_EXTRACT(preferences, '$.appointmentReminder.inApp') = true THEN 1 ELSE 0 END) as inApp
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.userId
      WHERE u.isActive = TRUE
    `;
    
    const categoryStats = await executeQuery(categoryQuery);
    stats.categories = categoryStats;
    
    return stats;
  } catch (error) {
    console.error('Get notification preference stats error:', error);
    throw error;
  }
};

// Reset user preferences to default
export const resetUserPreferences = async (userId) => {
  try {
    const query = `
      DELETE FROM notification_preferences 
      WHERE userId = ?
    `;
    
    await executeQuery(query, [userId]);
    
    // Log preference reset
    await logPreferenceChange(userId, DEFAULT_PREFERENCES, 'reset');
    
    return {
      success: true,
      preferences: DEFAULT_PREFERENCES
    };
  } catch (error) {
    console.error('Reset user preferences error:', error);
    throw error;
  }
};

// Bulk update user preferences
export const bulkUpdatePreferences = async (updates) => {
  try {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await updateUserNotificationPreferences(update.userId, update.preferences);
        results.push({
          userId: update.userId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          userId: update.userId,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      total: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Bulk update preferences error:', error);
    throw error;
  }
};

// Export user preferences
export const exportUserPreferences = async (userId) => {
  try {
    const preferences = await getUserNotificationPreferences(userId);
    
    return {
      userId,
      preferences,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  } catch (error) {
    console.error('Export user preferences error:', error);
    throw error;
  }
};

// Import user preferences
export const importUserPreferences = async (userId, preferencesData) => {
  try {
    // Validate imported data
    if (!preferencesData || typeof preferencesData !== 'object') {
      throw new Error('Invalid preferences data');
    }
    
    // Extract preferences (ignore metadata)
    const { preferences, ...metadata } = preferencesData;
    
    if (!preferences) {
      throw new Error('No preferences found in imported data');
    }
    
    // Update user preferences
    const result = await updateUserNotificationPreferences(userId, preferences);
    
    // Log import
    await logPreferenceChange(userId, preferences, 'import', metadata);
    
    return {
      success: true,
      importedAt: new Date().toISOString(),
      ...result
    };
  } catch (error) {
    console.error('Import user preferences error:', error);
    throw error;
  }
};

// Log preference change
export const logPreferenceChange = async (userId, preferences, action = 'update', metadata = null) => {
  try {
    const query = `
      INSERT INTO preference_change_logs (userId, action, preferences, metadata, changedAt)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [userId, action, JSON.stringify(preferences), metadata ? JSON.stringify(metadata) : null]);
  } catch (error) {
    console.error('Log preference change error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Get preference change history
export const getPreferenceChangeHistory = async (userId, limit = 50) => {
  try {
    const query = `
      SELECT action, preferences, metadata, changedAt
      FROM preference_change_logs 
      WHERE userId = ?
      ORDER BY changedAt DESC
      LIMIT ?
    `;
    
    const history = await executeQuery(query, [userId, limit]);
    
    return history.map(entry => ({
      ...entry,
      preferences: JSON.parse(entry.preferences),
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null
    }));
  } catch (error) {
    console.error('Get preference change history error:', error);
    throw error;
  }
};

// Get notification preferences by role
export const getPreferencesByRole = async (role) => {
  try {
    const query = `
      SELECT u.id, u.firstName, u.lastName, u.email,
             np.preferences, np.updatedAt
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.userId
      WHERE u.role = ? AND u.isActive = TRUE
      ORDER BY u.lastName, u.firstName
    `;
    
    const users = await executeQuery(query, [role]);
    
    return users.map(user => ({
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES
    }));
  } catch (error) {
    console.error('Get preferences by role error:', error);
    throw error;
  }
};

// Validate notification preference structure
export const validatePreferenceStructure = (preferences) => {
  const errors = [];
  
  // Check required fields
  const requiredGlobal = ['email', 'sms', 'push', 'inApp'];
  
  for (const field of requiredGlobal) {
    if (!preferences.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof preferences[field] !== 'boolean') {
      errors.push(`Field ${field} must be boolean`);
    }
  }
  
  // Check category structure
  const categories = ['appointmentBooked', 'appointmentConfirmed', 'appointmentCancelled', 'appointmentReminder'];
  
  for (const category of categories) {
    if (preferences[category]) {
      if (typeof preferences[category] !== 'object') {
        errors.push(`Category ${category} must be an object`);
      } else {
        for (const channel of ['email', 'sms', 'push', 'inApp']) {
          if (preferences[category].hasOwnProperty(channel) && typeof preferences[category][channel] !== 'boolean') {
            errors.push(`Category ${category}.${channel} must be boolean`);
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
