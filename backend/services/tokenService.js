import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// JWT configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ISSUER: process.env.JWT_ISSUER || 'medibook-system',
  AUDIENCE: process.env.JWT_AUDIENCE || 'medibook-users'
};

// Token blacklist for revoked tokens
const tokenBlacklist = new Set();

// Generate access token
export const generateAccessToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    iss: JWT_CONFIG.ISSUER,
    aud: JWT_CONFIG.AUDIENCE
  };

  return jwt.sign(payload, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
    algorithm: 'HS256'
  });
};

// Generate refresh token
export const generateRefreshToken = async (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh',
    sessionId: generateSessionId(),
    iat: Math.floor(Date.now() / 1000),
    iss: JWT_CONFIG.ISSUER,
    aud: JWT_CONFIG.AUDIENCE
  };

  const refreshToken = jwt.sign(payload, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
    algorithm: 'HS256'
  });

  // Store refresh token in database
  try {
    const query = `
      INSERT INTO refresh_tokens (userId, token, sessionId, expiresAt, createdAt)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())
      ON DUPLICATE KEY UPDATE 
      token = VALUES(token), 
      sessionId = VALUES(sessionId), 
      expiresAt = VALUES(expiresAt), 
      createdAt = VALUES(createdAt)
    `;
    
    await executeQuery(query, [user.id, refreshToken, payload.sessionId]);
  } catch (error) {
    console.error('Store refresh token error:', error);
    throw new Error('Failed to store refresh token');
  }

  return refreshToken;
};

// Verify access token
export const verifyAccessToken = (token) => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });

    // Check if token type is access
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else {
      throw error;
    }
  }
};

// Verify refresh token
export const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });

    // Check if token type is refresh
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if refresh token exists in database and is not revoked
    const query = `
      SELECT id, userId, sessionId, revoked, revokedAt
      FROM refresh_tokens 
      WHERE token = ? AND expiresAt > NOW()
    `;
    
    const result = await executeQuery(query, [token]);
    
    if (result.length === 0) {
      throw new Error('Refresh token not found or expired');
    }

    const refreshTokenData = result[0];
    
    if (refreshTokenData.revoked) {
      throw new Error('Refresh token has been revoked');
    }

    return { ...decoded, sessionId: refreshTokenData.sessionId };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
};

// Refresh access token
export const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    
    // Get user data
    const userQuery = `
      SELECT id, email, role, lastLogin
      FROM users 
      WHERE id = ? AND isActive = TRUE
    `;
    
    const users = await executeQuery(userQuery, [decoded.userId]);
    
    if (users.length === 0) {
      throw new Error('User not found or inactive');
    }
    
    const user = users[0];
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
    // Update last login
    await executeQuery(
      'UPDATE users SET lastLogin = NOW() WHERE id = ?',
      [user.id]
    );
    
    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    };
  } catch (error) {
    console.error('Refresh access token error:', error);
    throw error;
  }
};

// Revoke refresh token
export const revokeRefreshToken = async (token) => {
  try {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revokedAt = NOW() 
      WHERE token = ?
    `;
    
    const result = await executeQuery(query, [token]);
    
    if (result.affectedRows === 0) {
      throw new Error('Refresh token not found');
    }
    
    return true;
  } catch (error) {
    console.error('Revoke refresh token error:', error);
    throw error;
  }
};

// Revoke all refresh tokens for a user
export const revokeAllUserTokens = async (userId) => {
  try {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revokedAt = NOW() 
      WHERE userId = ? AND revoked = FALSE
    `;
    
    await executeQuery(query, [userId]);
    
    return true;
  } catch (error) {
    console.error('Revoke all user tokens error:', error);
    throw error;
  }
};

// Add token to blacklist
export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Remove from blacklist after token expires (cleanup)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 15 * 60 * 1000); // 15 minutes
};

// Check if token is blacklisted
export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Generate session ID
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Get active sessions for a user
export const getUserSessions = async (userId) => {
  try {
    const query = `
      SELECT sessionId, createdAt, expiresAt, lastUsed
      FROM refresh_tokens 
      WHERE userId = ? AND revoked = FALSE AND expiresAt > NOW()
      ORDER BY lastUsed DESC
    `;
    
    return await executeQuery(query, [userId]);
  } catch (error) {
    console.error('Get user sessions error:', error);
    throw error;
  }
};

// Revoke specific session
export const revokeSession = async (userId, sessionId) => {
  try {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revokedAt = NOW() 
      WHERE userId = ? AND sessionId = ?
    `;
    
    const result = await executeQuery(query, [userId, sessionId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Revoke session error:', error);
    throw error;
  }
};

// Clean up expired tokens
export const cleanupExpiredTokens = async () => {
  try {
    // Clean up expired refresh tokens
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expiresAt < NOW() OR (revoked = TRUE AND revokedAt < DATE_SUB(NOW(), INTERVAL 30 DAY))
    `;
    
    const result = await executeQuery(query);
    
    console.log(`Cleaned up ${result.affectedRows} expired refresh tokens`);
    
    return result.affectedRows;
  } catch (error) {
    console.error('Cleanup expired tokens error:', error);
    throw error;
  }
};

// Validate token payload
export const validateTokenPayload = (payload) => {
  const required = ['userId', 'type', 'iat', 'iss', 'aud'];
  
  for (const field of required) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check if token is too old (issued more than 30 minutes ago)
  const now = Math.floor(Date.now() / 1000);
  if (now - payload.iat > 30 * 60) {
    throw new Error('Token is too old');
  }
  
  return true;
};

// Get token information
export const getTokenInfo = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    
    return {
      header: decoded.header,
      payload: decoded.payload,
      signature: decoded.signature
    };
  } catch (error) {
    throw new Error('Invalid token format');
  }
};

// Generate token pair
export const generateTokenPair = async (user) => {
  try {
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN
    };
  } catch (error) {
    console.error('Generate token pair error:', error);
    throw error;
  }
};
