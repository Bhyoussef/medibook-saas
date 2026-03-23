import { executeQuery } from '../config/database.js';

// Create notification
export const createNotification = async (userId, doctorId, appointmentId, type, title, message, priority = 'medium', actionUrl = null, actionText = null) => {
  try {
    // Input validation
    if (!type || !title || !message) {
      throw new Error('Missing required fields: type, title, message');
    }
    
    // Validate type
    const validTypes = ['appointment', 'reminder', 'cancellation', 'reschedule', 'payment', 'system', 'promotion', 'feedback'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
    
    // Validate title and message length
    if (title.trim().length < 3 || title.trim().length > 200) {
      throw new Error('Title must be between 3 and 200 characters');
    }
    
    if (message.trim().length < 10 || message.trim().length > 1000) {
      throw new Error('Message must be between 10 and 1000 characters');
    }
    
    // Validate actionText if provided
    if (actionText && (actionText.trim().length < 2 || actionText.trim().length > 100)) {
      throw new Error('Action text must be between 2 and 100 characters');
    }
    
    // Set expiration based on priority
    let expiresAt = null;
    const now = new Date();
    switch (priority) {
      case 'urgent':
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'high':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case 'medium':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      case 'low':
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
        break;
    }
    
    const query = `
      INSERT INTO notifications (userId, doctorId, appointmentId, type, title, message, priority, actionUrl, actionText, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await executeQuery(query, [
      userId, 
      doctorId, 
      appointmentId, 
      type, 
      title.trim(), 
      message.trim(), 
      priority, 
      actionUrl ? actionUrl.trim() : null, 
      actionText ? actionText.trim() : null,
      expiresAt
    ]);
    
    return result.insertId;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Get notifications for doctors (separate from user notifications)
export const getDoctorNotifications = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;
    
    // Verify user is a doctor
    const doctorCheck = await executeQuery('SELECT id FROM doctors WHERE id = ?', [doctorId]);
    if (doctorCheck.length === 0) {
      return res.status(403).json({ message: 'Access denied. Only doctors can access their notifications.' });
    }
    
    let query = `
      SELECT n.*, 
             u.firstName as userFirstName, u.lastName as userLastName,
             a.date as appointmentDate, a.time as appointmentTime
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      LEFT JOIN appointments a ON n.appointmentId = a.id
      WHERE n.doctorId = ? AND n.userId IS NULL
    `;
    
    const params = [doctorId];
    
    if (unreadOnly === 'true') {
      query += ' AND n.isRead = FALSE';
    }
    
    // Filter out expired notifications
    query += ' AND (n.expiresAt IS NULL OR n.expiresAt > NOW())';
    
    query += ' ORDER BY n.priority DESC, n.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const notifications = await executeQuery(query, params);
    
    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Get doctor notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve notifications' 
    });
  }
};

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, unreadOnly = false, type = null } = req.query;
    
    // Input validation
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Verify user can only access their own notifications
    if (userId != req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only access your own notifications.' });
    }
    
    // Validate limit and offset
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    
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
    
    if (unreadOnly === 'true') {
      query += ' AND n.isRead = FALSE';
    }
    
    // Filter by type if specified
    if (type) {
      const validTypes = ['appointment', 'reminder', 'cancellation', 'reschedule', 'payment', 'system', 'promotion', 'feedback'];
      if (validTypes.includes(type)) {
        query += ' AND n.type = ?';
        params.push(type);
      }
    }
    
    // Filter out expired notifications
    query += ' AND (n.expiresAt IS NULL OR n.expiresAt > NOW())';
    
    query += ' ORDER BY n.priority DESC, n.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);
    
    const notifications = await executeQuery(query, params);
    
    res.json({
      success: true,
      notifications,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: notifications.length
      }
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve notifications' 
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE userId = ? AND isRead = FALSE 
      AND (expiresAt IS NULL OR expiresAt > NOW())
    `;
    
    const result = await executeQuery(query, [userId]);
    
    res.json({
      success: true,
      unreadCount: result[0].count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get unread count' 
    });
  }
};

// Get unread count for doctors
export const getDoctorUnreadCount = async (req, res) => {
  try {
    const doctorId = req.user.id;
    
    // Verify user is a doctor
    const doctorCheck = await executeQuery('SELECT id FROM doctors WHERE id = ?', [doctorId]);
    if (doctorCheck.length === 0) {
      return res.status(403).json({ message: 'Access denied. Only doctors can access their notifications.' });
    }
    
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE doctorId = ? AND userId IS NULL AND isRead = FALSE 
      AND (expiresAt IS NULL OR expiresAt > NOW())
    `;
    
    const result = await executeQuery(query, [doctorId]);
    
    res.json({
      success: true,
      unreadCount: result[0].count
    });
  } catch (error) {
    console.error('Get doctor unread count error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get unread count' 
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Input validation
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Valid notification ID is required' });
    }
    
    // Get notification to verify ownership
    const getQuery = 'SELECT userId, doctorId FROM notifications WHERE id = ?';
    const notifications = await executeQuery(getQuery, [id]);
    
    if (notifications.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    const notification = notifications[0];
    
    // Verify user can only mark their own notifications
    // Check if it's a user notification or doctor notification
    if (notification.userId && notification.userId != req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only mark your own notifications.' });
    }
    
    if (notification.doctorId && notification.doctorId != req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only mark your own notifications.' });
    }
    
    // Check if already read
    const checkReadQuery = 'SELECT isRead FROM notifications WHERE id = ?';
    const readCheck = await executeQuery(checkReadQuery, [id]);
    
    if (readCheck[0].isRead) {
      return res.status(200).json({ message: 'Notification already marked as read' });
    }
    
    const updateQuery = `
      UPDATE notifications 
      SET isRead = TRUE, readAt = NOW() 
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [id]);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark notification as read' 
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const updateQuery = `
      UPDATE notifications 
      SET isRead = TRUE, readAt = NOW() 
      WHERE userId = ? AND isRead = FALSE
      AND (expiresAt IS NULL OR expiresAt > NOW())
    `;
    
    const result = await executeQuery(updateQuery, [userId]);
    
    res.json({ 
      success: true,
      message: 'All notifications marked as read',
      count: result.affectedRows 
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark all notifications as read' 
    });
  }
};

// Mark all doctor notifications as read
export const markAllDoctorAsRead = async (req, res) => {
  try {
    const doctorId = req.user.id;
    
    // Verify user is a doctor
    const doctorCheck = await executeQuery('SELECT id FROM doctors WHERE id = ?', [doctorId]);
    if (doctorCheck.length === 0) {
      return res.status(403).json({ message: 'Access denied. Only doctors can access their notifications.' });
    }
    
    const updateQuery = `
      UPDATE notifications 
      SET isRead = TRUE, readAt = NOW() 
      WHERE doctorId = ? AND userId IS NULL AND isRead = FALSE
      AND (expiresAt IS NULL OR expiresAt > NOW())
    `;
    
    const result = await executeQuery(updateQuery, [doctorId]);
    
    res.json({ 
      success: true,
      message: 'All doctor notifications marked as read',
      count: result.affectedRows 
    });
  } catch (error) {
    console.error('Mark all doctor as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark all notifications as read' 
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Input validation
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Valid notification ID is required' });
    }
    
    // Get notification to verify ownership
    const getQuery = 'SELECT userId, doctorId FROM notifications WHERE id = ?';
    const notifications = await executeQuery(getQuery, [id]);
    
    if (notifications.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    const notification = notifications[0];
    
    // Verify user can only delete their own notifications
    if (notification.userId && notification.userId != req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own notifications.' });
    }
    
    if (notification.doctorId && notification.doctorId != req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own notifications.' });
    }
    
    const deleteQuery = 'DELETE FROM notifications WHERE id = ?';
    await executeQuery(deleteQuery, [id]);
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete notification' 
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(isRead = FALSE) as unread,
        SUM(isRead = TRUE) as read,
        SUM(priority = 'urgent') as urgent,
        SUM(priority = 'high') as high,
        SUM(priority = 'medium') as medium,
        SUM(priority = 'low') as low
      FROM notifications 
      WHERE userId = ? 
      AND (expiresAt IS NULL OR expiresAt > NOW())
    `;
    
    const stats = await executeQuery(statsQuery, [userId]);
    
    const typeStatsQuery = `
      SELECT type, COUNT(*) as count 
      FROM notifications 
      WHERE userId = ? 
      AND (expiresAt IS NULL OR expiresAt > NOW())
      GROUP BY type 
      ORDER BY count DESC
    `;
    
    const typeStats = await executeQuery(typeStatsQuery, [userId]);
    
    res.json({
      overview: stats[0],
      byType: typeStats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
