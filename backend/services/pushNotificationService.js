import { executeQuery } from '../config/database.js';

// Push notification configuration
const PUSH_CONFIG = {
  vapid: {
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@medibook.com',
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY
  }
};

// Push notification templates
const PUSH_TEMPLATES = {
  appointment_booked: {
    title: 'Appointment Booked',
    body: 'Your appointment has been successfully booked',
    icon: '/appointment-booked.png',
    badge: 1,
    data: { type: 'appointment', action: 'booked' }
  },
  
  appointment_confirmed: {
    title: 'Appointment Confirmed',
    body: 'Your appointment has been confirmed by the doctor',
    icon: '/appointment-confirmed.png',
    badge: 1,
    data: { type: 'appointment', action: 'confirmed' }
  },
  
  appointment_cancelled: {
    title: 'Appointment Cancelled',
    body: 'Your appointment has been cancelled',
    icon: '/appointment-cancelled.png',
    badge: 1,
    data: { type: 'appointment', action: 'cancelled' }
  },
  
  appointment_reminder: {
    title: 'Appointment Reminder',
    body: 'Don\'t forget about your upcoming appointment',
    icon: '/appointment-reminder.png',
    badge: 1,
    data: { type: 'appointment', action: 'reminder' }
  },
  
  new_message: {
    title: 'New Message',
    body: 'You have received a new message',
    icon: '/new-message.png',
    badge: 1,
    data: { type: 'message', action: 'new' }
  }
};

// Web Push Notification Service
class WebPushService {
  constructor() {
    this.vapidKeys = PUSH_CONFIG.vapid;
  }

  async sendPushNotification(subscription, payload) {
    try {
      const webpush = await import('web-push');
      
      // Set VAPID details
      webpush.setVapidDetails(
        this.vapidKeys.subject,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );

      const result = await webpush.sendNotification(
        subscription.endpoint,
        JSON.stringify(payload)
      );

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Web Push error:', error);
      
      // Check if subscription is invalid/expired
      if (error.statusCode === 410 || error.statusCode === 404) {
        return {
          success: false,
          error: 'Subscription expired',
          shouldRemove: true
        };
      }
      
      throw error;
    }
  }
}

// Firebase Cloud Messaging Service
class FCMService {
  constructor() {
    this.serverKey = PUSH_CONFIG.fcm.serverKey;
  }

  async sendPushNotification(tokens, payload) {
    try {
      const url = 'https://fcm.googleapis.com/fcm/send';
      
      const body = {
        registration_ids: Array.isArray(tokens) ? tokens : [tokens],
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          sound: 'default',
          click_action: payload.clickAction || '/'
        },
        data: payload.data || {},
        priority: payload.priority || 'high'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send FCM notification');
      }

      // Process results
      const successful = [];
      const failed = [];
      
      if (result.results) {
        result.results.forEach((item, index) => {
          if (item.error) {
            failed.push({
              token: tokens[index],
              error: item.error,
              shouldRemove: item.error === 'NotRegistered' || item.error === 'InvalidRegistration'
            });
          } else {
            successful.push({
              token: tokens[index],
              messageId: item.message_id
            });
          }
        });
      }

      return {
        success: true,
        successful,
        failed,
        provider: 'fcm'
      };
    } catch (error) {
      console.error('FCM error:', error);
      throw error;
    }
  }
}

// Get push notification provider
const getPushProvider = (type = 'web') => {
  switch (type) {
    case 'web':
      return new WebPushService();
    case 'fcm':
      return new FCMService();
    default:
      throw new Error(`Unsupported push notification provider: ${type}`);
  }
};

// Send push notification
export const sendPushNotification = async (userId, template, data, options = {}) => {
  try {
    // Get user's push subscriptions
    const subscriptions = await getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      return { success: false, reason: 'No push subscriptions found' };
    }

    // Check if user has push notifications enabled
    const preferences = await getUserNotificationPreferences(userId);
    if (!preferences.push) {
      return { success: false, reason: 'Push notifications disabled' };
    }

    // Get push notification template
    const pushTemplate = PUSH_TEMPLATES[template];
    
    if (!pushTemplate) {
      throw new Error(`Push notification template '${template}' not found`);
    }

    // Create payload
    const payload = {
      title: options.title || pushTemplate.title,
      body: options.body || pushTemplate.body,
      icon: options.icon || pushTemplate.icon,
      badge: options.badge || pushTemplate.badge,
      data: { ...pushTemplate.data, ...data },
      clickAction: options.clickAction,
      priority: options.priority
    };

    const results = [];
    
    // Send to web subscriptions
    const webSubscriptions = subscriptions.filter(s => s.type === 'web');
    if (webSubscriptions.length > 0) {
      const webProvider = getPushProvider('web');
      
      for (const subscription of webSubscriptions) {
        try {
          const result = await webProvider.sendPushNotification(
            JSON.parse(subscription.subscription),
            payload
          );
          
          results.push({
            type: 'web',
            subscriptionId: subscription.id,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            type: 'web',
            subscriptionId: subscription.id,
            success: false,
            error: error.message,
            shouldRemove: error.shouldRemove
          });
        }
      }
    }

    // Send to FCM subscriptions
    const fcmSubscriptions = subscriptions.filter(s => s.type === 'fcm');
    if (fcmSubscriptions.length > 0) {
      const fcmTokens = fcmSubscriptions.map(s => s.token);
      const fcmProvider = getPushProvider('fcm');
      
      try {
        const result = await fcmProvider.sendPushNotification(fcmTokens, payload);
        
        // Process FCM results
        result.successful.forEach(success => {
          const subscription = fcmSubscriptions.find(s => s.token === success.token);
          results.push({
            type: 'fcm',
            subscriptionId: subscription.id,
            success: true,
            messageId: success.messageId
          });
        });
        
        result.failed.forEach(failure => {
          const subscription = fcmSubscriptions.find(s => s.token === failure.token);
          results.push({
            type: 'fcm',
            subscriptionId: subscription.id,
            success: false,
            error: failure.error,
            shouldRemove: failure.shouldRemove
          });
        });
      } catch (error) {
        console.error('FCM batch send error:', error);
        
        // Mark all FCM subscriptions as failed
        fcmSubscriptions.forEach(subscription => {
          results.push({
            type: 'fcm',
            subscriptionId: subscription.id,
            success: false,
            error: error.message
          });
        });
      }
    }

    // Remove invalid subscriptions
    const toRemove = results.filter(r => r.shouldRemove);
    if (toRemove.length > 0) {
      await removeInvalidSubscriptions(toRemove.map(r => r.subscriptionId));
    }

    // Log push notification sent
    await logPushNotificationSent(userId, template, results);

    return {
      success: true,
      total: subscriptions.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Send push notification error:', error);
    
    // Log push notification failure
    await logPushNotificationFailure(userId, template, error.message);
    
    throw new Error(`Failed to send push notification: ${error.message}`);
  }
};

// Send notification push notification
export const sendNotificationPush = async (userId, notificationId) => {
  try {
    // Get notification details
    const notificationQuery = `
      SELECT n.*, u.firstName, u.lastName,
             d.firstName as doctorFirstName, d.lastName as doctorLastName,
             a.date, a.time
      FROM notifications n
      JOIN users u ON n.userId = u.id
      LEFT JOIN doctors d ON n.doctorId = d.id
      LEFT JOIN appointments a ON n.appointmentId = a.id
      WHERE n.id = ?
    `;
    
    const notifications = await executeQuery(notificationQuery, [notificationId]);
    
    if (notifications.length === 0) {
      throw new Error('Notification not found');
    }
    
    const notification = notifications[0];
    
    // Determine template based on notification type
    let template = 'appointment_booked'; // default
    let pushData = {
      doctorFirstName: notification.doctorFirstName,
      doctorLastName: notification.doctorLastName,
      date: notification.date,
      time: notification.time,
      notificationId: notification.id
    };
    
    switch (notification.type) {
      case 'appointment':
        if (notification.title.includes('Confirmed')) {
          template = 'appointment_confirmed';
        } else if (notification.title.includes('Cancelled')) {
          template = 'appointment_cancelled';
        }
        break;
      case 'reminder':
        template = 'appointment_reminder';
        break;
    }
    
    const result = await sendPushNotification(userId, template, pushData);
    
    // Update notification to mark push as sent
    await executeQuery(
      'UPDATE notifications SET pushSent = TRUE, pushSentAt = NOW() WHERE id = ?',
      [notificationId]
    );
    
    return result;
  } catch (error) {
    console.error('Send notification push error:', error);
    throw error;
  }
};

// Get user push subscriptions
export const getUserPushSubscriptions = async (userId) => {
  try {
    const query = `
      SELECT id, type, subscription, token, userAgent, isActive, createdAt
      FROM push_subscriptions 
      WHERE userId = ? AND isActive = TRUE
      ORDER BY createdAt DESC
    `;
    
    const subscriptions = await executeQuery(query, [userId]);
    
    return subscriptions;
  } catch (error) {
    console.error('Get user push subscriptions error:', error);
    throw error;
  }
};

// Add push subscription
export const addPushSubscription = async (userId, subscriptionData) => {
  try {
    const { type, subscription, token, userAgent } = subscriptionData;
    
    if (!type || !subscription) {
      throw new Error('Subscription type and data are required');
    }

    const query = `
      INSERT INTO push_subscriptions (userId, type, subscription, token, userAgent, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, TRUE, NOW())
    `;
    
    const result = await executeQuery(query, [userId, type, subscription, token, userAgent]);
    
    return {
      success: true,
      subscriptionId: result.insertId
    };
  } catch (error) {
    console.error('Add push subscription error:', error);
    throw error;
  }
};

// Remove push subscription
export const removePushSubscription = async (userId, subscriptionId) => {
  try {
    const query = `
      UPDATE push_subscriptions 
      SET isActive = FALSE, removedAt = NOW() 
      WHERE id = ? AND userId = ?
    `;
    
    const result = await executeQuery(query, [subscriptionId, userId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Subscription not found or access denied');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Remove push subscription error:', error);
    throw error;
  }
};

// Remove invalid subscriptions
export const removeInvalidSubscriptions = async (subscriptionIds) => {
  try {
    if (subscriptionIds.length === 0) {
      return { success: true, removed: 0 };
    }

    const placeholders = subscriptionIds.map(() => '?').join(',');
    const query = `
      UPDATE push_subscriptions 
      SET isActive = FALSE, removedAt = NOW() 
      WHERE id IN (${placeholders})
    `;
    
    const result = await executeQuery(query, subscriptionIds);
    
    return { success: true, removed: result.affectedRows };
  } catch (error) {
    console.error('Remove invalid subscriptions error:', error);
    throw error;
  }
};

// Send welcome push notification
export const sendWelcomePush = async (userId) => {
  try {
    const userQuery = `
      SELECT firstName, lastName
      FROM users 
      WHERE id = ?
    `;
    
    const users = await executeQuery(userQuery, [userId]);
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const user = users[0];
    
    const pushData = {
      firstName: user.firstName,
      userId: userId
    };
    
    const result = await sendPushNotification(userId, 'appointment_booked', pushData, {
      title: 'Welcome to MediBook!',
      body: 'Your account has been created successfully',
      icon: '/welcome.png'
    });
    
    return result;
  } catch (error) {
    console.error('Send welcome push error:', error);
    throw error;
  }
};

// Get user notification preferences
export const getUserNotificationPreferences = async (userId) => {
  try {
    const query = `
      SELECT email, sms, push, inApp, appointmentReminders, marketingEmails
      FROM notification_preferences 
      WHERE userId = ?
    `;
    
    const result = await executeQuery(query, [userId]);
    
    if (result.length === 0) {
      // Return default preferences
      return {
        email: true,
        sms: true,
        push: true,
        inApp: true,
        appointmentReminders: true,
        marketingEmails: false
      };
    }
    
    return result[0];
  } catch (error) {
    console.error('Get user notification preferences error:', error);
    throw error;
  }
};

// Log push notification sent
export const logPushNotificationSent = async (userId, template, results) => {
  try {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    const query = `
      INSERT INTO push_logs (userId, template, totalSent, successful, failed, sentAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [userId, template, results.length, successful, failed]);
  } catch (error) {
    console.error('Log push notification sent error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Log push notification failure
export const logPushNotificationFailure = async (userId, template, errorMessage) => {
  try {
    const query = `
      INSERT INTO push_logs (userId, template, status, error, sentAt)
      VALUES (?, ?, 'failed', ?, NOW())
    `;
    
    await executeQuery(query, [userId, template, errorMessage]);
  } catch (error) {
    console.error('Log push notification failure error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Get push notification statistics
export const getPushStats = async (period = '30') => {
  try {
    const periodDays = parseInt(period);
    const query = `
      SELECT 
        template,
        COUNT(*) as total,
        SUM(totalSent) as totalSent,
        SUM(successful) as successful,
        SUM(failed) as failed,
        SUM(successful) / NULLIF(SUM(totalSent), 0) * 100 as successRate
      FROM push_logs 
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY template
      ORDER BY totalSent DESC
    `;
    
    const stats = await executeQuery(query, [periodDays]);
    
    return {
      period: `${periodDays} days`,
      stats
    };
  } catch (error) {
    console.error('Get push stats error:', error);
    throw error;
  }
};

// Test push notification configuration
export const testPushConfig = async () => {
  try {
    // Test VAPID keys
    if (!PUSH_CONFIG.vapid.publicKey || !PUSH_CONFIG.vapid.privateKey) {
      return { 
        success: false, 
        message: 'VAPID keys not configured',
        provider: 'web'
      };
    }
    
    // Test FCM key
    if (!PUSH_CONFIG.fcm.serverKey) {
      return { 
        success: false, 
        message: 'FCM server key not configured',
        provider: 'fcm'
      };
    }
    
    return { 
      success: true, 
      message: 'Push notification configuration is valid',
      providers: ['web', 'fcm']
    };
  } catch (error) {
    console.error('Test push config error:', error);
    return { success: false, message: error.message };
  }
};

// Clean up inactive subscriptions
export const cleanupInactiveSubscriptions = async () => {
  try {
    // Remove subscriptions that haven't been used in 30 days
    const query = `
      UPDATE push_subscriptions 
      SET isActive = FALSE, removedAt = NOW() 
      WHERE isActive = TRUE 
        AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND id NOT IN (
          SELECT DISTINCT subscriptionId 
          FROM push_logs 
          WHERE sentAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        )
    `;
    
    const result = await executeQuery(query);
    
    console.log(`Cleaned up ${result.affectedRows} inactive push subscriptions`);
    
    return result.affectedRows;
  } catch (error) {
    console.error('Cleanup inactive subscriptions error:', error);
    throw error;
  }
};

// Get VAPID public key for web push
export const getVAPIDPublicKey = () => {
  if (!PUSH_CONFIG.vapid.publicKey) {
    throw new Error('VAPID public key not configured');
  }
  
  return PUSH_CONFIG.vapid.publicKey;
};
