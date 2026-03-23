import { findOne, findMany, insert, update, deleteRecord, count } from '../config/db.js';

export class Notification {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.doctorId = data.doctorId;
    this.appointmentId = data.appointmentId;
    this.type = data.type;
    this.title = data.title;
    this.message = data.message;
    this.isRead = data.isRead;
    this.priority = data.priority;
    this.actionUrl = data.actionUrl;
    this.actionText = data.actionText;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt;
    this.readAt = data.readAt;
  }

  get isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  get priorityColor() {
    const colors = {
      'low': 'gray',
      'medium': 'blue',
      'high': 'orange',
      'urgent': 'red'
    };
    return colors[this.priority] || 'gray';
  }

  get typeIcon() {
    const icons = {
      'appointment': '📅',
      'reminder': '⏰',
      'cancellation': '❌',
      'reschedule': '🔄',
      'payment': '💳',
      'system': '🔔',
      'promotion': '📢',
      'feedback': '⭐'
    };
    return icons[this.type] || '📢';
  }

  get formattedCreatedAt() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return created.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: created.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      doctorId: this.doctorId,
      appointmentId: this.appointmentId,
      type: this.type,
      title: this.title,
      message: this.message,
      isRead: this.isRead,
      priority: this.priority,
      actionUrl: this.actionUrl,
      actionText: this.actionText,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      readAt: this.readAt,
      isExpired: this.isExpired,
      priorityColor: this.priorityColor,
      typeIcon: this.typeIcon,
      formattedCreatedAt: this.formattedCreatedAt
    };
  }
}

export class NotificationModel {
  static async findById(id) {
    try {
      const query = `
        SELECT n.*, 
               u.firstName as userFirstName, u.lastName as userLastName,
               d.firstName as doctorFirstName, d.lastName as doctorLastName,
               a.date as appointmentDate, a.time as appointmentTime
        FROM notifications n
        LEFT JOIN users u ON n.userId = u.id
        LEFT JOIN doctors d ON n.doctorId = d.id
        LEFT JOIN appointments a ON n.appointmentId = a.id
        WHERE n.id = ?
      `;
      const notification = await findOne(query, [id]);
      return notification ? new Notification(notification) : null;
    } catch (error) {
      console.error('Error finding notification by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, unreadOnly = false, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT n.*, 
               d.firstName as doctorFirstName, d.lastName as doctorLastName,
               a.date as appointmentDate, a.time as appointmentTime
        FROM notifications n
        LEFT JOIN doctors d ON n.doctorId = d.id
        LEFT JOIN appointments a ON n.appointmentId = a.id
        WHERE n.userId = ?
      `;
      const params = [userId];
      
      if (unreadOnly) {
        query += ' AND n.isRead = FALSE';
      }
      
      query += ' AND (n.expiresAt IS NULL OR n.expiresAt > NOW())';
      query += ' ORDER BY n.priority DESC, n.createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const notifications = await findMany(query, params);
      return notifications.map(notification => new Notification(notification));
    } catch (error) {
      console.error('Error finding notifications by user ID:', error);
      throw error;
    }
  }

  static async findByDoctorId(doctorId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT n.*, 
               u.firstName as userFirstName, u.lastName as userLastName,
               a.date as appointmentDate, a.time as appointmentTime
        FROM notifications n
        LEFT JOIN users u ON n.userId = u.id
        LEFT JOIN appointments a ON n.appointmentId = a.id
        WHERE n.doctorId = ?
        ORDER BY n.priority DESC, n.createdAt DESC LIMIT ? OFFSET ?
      `;
      const notifications = await findMany(query, [doctorId, limit, offset]);
      return notifications.map(notification => new Notification(notification));
    } catch (error) {
      console.error('Error finding notifications by doctor ID:', error);
      throw error;
    }
  }

  static async findByType(type, userId = null, limit = 50) {
    try {
      let query = `
        SELECT n.*, 
               u.firstName as userFirstName, u.lastName as userLastName,
               d.firstName as doctorFirstName, d.lastName as doctorLastName
        FROM notifications n
        LEFT JOIN users u ON n.userId = u.id
        LEFT JOIN doctors d ON n.doctorId = d.id
        WHERE n.type = ?
      `;
      const params = [type];
      
      if (userId) {
        query += ' AND n.userId = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY n.createdAt DESC LIMIT ?';
      params.push(limit);
      
      const notifications = await findMany(query, params);
      return notifications.map(notification => new Notification(notification));
    } catch (error) {
      console.error('Error finding notifications by type:', error);
      throw error;
    }
  }

  static async create(notificationData) {
    try {
      const result = await insert('notifications', notificationData);
      
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async update(id, notificationData) {
    try {
      const result = await update('notifications', notificationData, 'id = ?', [id]);
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteRecord('notifications', 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async markAsRead(id) {
    try {
      const result = await update('notifications', { 
        isRead: true, 
        readAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const result = await update('notifications', { 
        isRead: true, 
        readAt: new Date() 
      }, 'userId = ? AND isRead = FALSE', [userId]);
      return result.affectedRows;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE userId = ? AND isRead = FALSE 
        AND (expiresAt IS NULL OR expiresAt > NOW())
      `;
      const result = await findOne(query, [userId]);
      return result.count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  static async createAppointmentNotification(userId, doctorId, appointmentId, type, title, message, priority = 'medium') {
    try {
      const notificationData = {
        userId,
        doctorId,
        appointmentId,
        type,
        title,
        message,
        priority,
        isRead: false,
        actionUrl: `/appointments/${appointmentId}`,
        actionText: 'View Appointment'
      };
      
      return await this.create(notificationData);
    } catch (error) {
      console.error('Error creating appointment notification:', error);
      throw error;
    }
  }

  static async createSystemNotification(userId, title, message, priority = 'medium', actionUrl = null) {
    try {
      const notificationData = {
        userId,
        type: 'system',
        title,
        message,
        priority,
        isRead: false,
        actionUrl,
        actionText: actionUrl ? 'View Details' : null
      };
      
      return await this.create(notificationData);
    } catch (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }
  }

  static async createBulkNotifications(userIds, notificationData) {
    try {
      const results = [];
      for (const userId of userIds) {
        try {
          const userNotification = { ...notificationData, userId };
          const notification = await this.create(userNotification);
          if (notification) results.push(notification);
        } catch (error) {
          console.error(`Error creating notification for user ${userId}:`, error);
        }
      }
      return results;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  static async cleanupExpiredNotifications() {
    try {
      const result = await deleteRecord('notifications', 'expiresAt IS NOT NULL AND expiresAt <= NOW()');
      return result.affectedRows;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  static async getNotificationStats(userId = null) {
    try {
      let whereClause = '1=1';
      const params = [];
      
      if (userId) {
        whereClause += ' AND userId = ?';
        params.push(userId);
      }
      
      const totalNotifications = await count('notifications', whereClause, params);
      const unreadNotifications = await count('notifications', `${whereClause} AND isRead = FALSE`, params);
      const expiredNotifications = await count('notifications', `${whereClause} AND expiresAt IS NOT NULL AND expiresAt <= NOW()`, params);
      
      // Get notifications by type
      const typeQuery = `
        SELECT type, COUNT(*) as count 
        FROM notifications 
        WHERE ${whereClause}
        GROUP BY type 
        ORDER BY count DESC
      `;
      const typeStats = await findMany(typeQuery, params);
      
      // Get notifications by priority
      const priorityQuery = `
        SELECT priority, COUNT(*) as count 
        FROM notifications 
        WHERE ${whereClause}
        GROUP BY priority 
        ORDER BY FIELD(priority, 'urgent', 'high', 'medium', 'low')
      `;
      const priorityStats = await findMany(priorityQuery, params);
      
      return {
        totalNotifications,
        unreadNotifications,
        expiredNotifications,
        typeStats,
        priorityStats
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  static async scheduleNotification(notificationData, scheduledAt) {
    try {
      // This would typically use a job queue like Bull or Agenda
      // For now, we'll just create the notification with a future created date
      const scheduledNotification = {
        ...notificationData,
        createdAt: scheduledAt
      };
      
      return await this.create(scheduledNotification);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }
}

export class NotificationFactory {
  static fromDatabase(data) {
    return new Notification(data);
  }

  static create(notificationData) {
    return new Notification({
      id: null,
      userId: notificationData.userId,
      doctorId: notificationData.doctorId || null,
      appointmentId: notificationData.appointmentId || null,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      isRead: false,
      priority: notificationData.priority || 'medium',
      actionUrl: notificationData.actionUrl || null,
      actionText: notificationData.actionText || null,
      expiresAt: notificationData.expiresAt || null,
      createdAt: new Date(),
      readAt: null
    });
  }
}
