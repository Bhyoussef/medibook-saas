import nodemailer from 'nodemailer';
import { executeQuery } from '../config/database.js';

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  },
  from: process.env.EMAIL_FROM || 'noreply@medibook.com'
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: EMAIL_CONFIG.auth,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const EMAIL_TEMPLATES = {
  appointment_booked: {
    subject: 'Appointment Booked Successfully - MediBook',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Booked - MediBook</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Appointment Confirmed</h1>
            <p>Your appointment has been successfully booked</p>
          </div>
          <div class="content">
            <h2>Appointment Details</h2>
            <div class="appointment-details">
              <div class="detail-row">
                <strong>Doctor:</strong>
                <span>Dr. ${data.doctorFirstName} ${data.doctorLastName}</span>
              </div>
              <div class="detail-row">
                <strong>Specialty:</strong>
                <span>${data.doctorSpecialty}</span>
              </div>
              <div class="detail-row">
                <strong>Date:</strong>
                <span>${new Date(data.date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <strong>Time:</strong>
                <span>${data.time}</span>
              </div>
              <div class="detail-row">
                <strong>Reason:</strong>
                <span>${data.reason}</span>
              </div>
              ${data.consultationFee ? `
              <div class="detail-row">
                <strong>Consultation Fee:</strong>
                <span>$${data.consultationFee}</span>
              </div>
              ` : ''}
            </div>
            <p>Please arrive 15 minutes before your appointment time.</p>
            <a href="${data.appointmentUrl}" class="btn">View Appointment</a>
            <div class="footer">
              <p>© 2024 MediBook. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointment_confirmed: {
    subject: 'Appointment Confirmed - MediBook',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmed - MediBook</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .confirmed-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Appointment Confirmed</h1>
            <p>Your appointment has been confirmed by the doctor</p>
          </div>
          <div class="content">
            <div class="confirmed-badge">CONFIRMED</div>
            <h2>Appointment Details</h2>
            <div class="appointment-details">
              <div class="detail-row">
                <strong>Doctor:</strong>
                <span>Dr. ${data.doctorFirstName} ${data.doctorLastName}</span>
              </div>
              <div class="detail-row">
                <strong>Date:</strong>
                <span>${new Date(data.date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <strong>Time:</strong>
                <span>${data.time}</span>
              </div>
            </div>
            <p>Your appointment is confirmed. Please arrive 15 minutes before your scheduled time.</p>
            <a href="${data.appointmentUrl}" class="btn">View Appointment</a>
            <div class="footer">
              <p>© 2024 MediBook. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointment_cancelled: {
    subject: 'Appointment Cancelled - MediBook',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Cancelled - MediBook</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .cancelled-badge { background: #dc3545; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Appointment Cancelled</h1>
            <p>Your appointment has been cancelled</p>
          </div>
          <div class="content">
            <div class="cancelled-badge">CANCELLED</div>
            <h2>Cancelled Appointment Details</h2>
            <div class="appointment-details">
              <div class="detail-row">
                <strong>Doctor:</strong>
                <span>Dr. ${data.doctorFirstName} ${data.doctorLastName}</span>
              </div>
              <div class="detail-row">
                <strong>Date:</strong>
                <span>${new Date(data.date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <strong>Time:</strong>
                <span>${data.time}</span>
              </div>
              ${data.cancelReason ? `
              <div class="detail-row">
                <strong>Reason:</strong>
                <span>${data.cancelReason}</span>
              </div>
              ` : ''}
            </div>
            <p>${data.cancelMessage || 'Your appointment has been cancelled. If you need to reschedule, please book a new appointment.'}</p>
            <a href="${data.bookUrl}" class="btn">Book New Appointment</a>
            <div class="footer">
              <p>© 2024 MediBook. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  appointment_reminder: {
    subject: 'Appointment Reminder - MediBook',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Reminder - MediBook</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder-badge { background: #17a2b8; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .countdown { background: #ffc107; color: #333; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold; }
          .btn { display: inline-block; background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Appointment Reminder</h1>
            <p>Don't forget about your upcoming appointment</p>
          </div>
          <div class="content">
            <div class="reminder-badge">REMINDER</div>
            <h2>Upcoming Appointment</h2>
            ${data.timeUntil ? `<div class="countdown">${data.timeUntil}</div>` : ''}
            <div class="appointment-details">
              <div class="detail-row">
                <strong>Doctor:</strong>
                <span>Dr. ${data.doctorFirstName} ${data.doctorLastName}</span>
              </div>
              <div class="detail-row">
                <strong>Date:</strong>
                <span>${new Date(data.date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <strong>Time:</strong>
                <span>${data.time}</span>
              </div>
              <div class="detail-row">
                <strong>Location:</strong>
                <span>${data.location || 'Main Clinic'}</span>
              </div>
            </div>
            <p>${data.reminderMessage || 'Please arrive 15 minutes before your appointment time and bring any necessary documents.'}</p>
            <a href="${data.appointmentUrl}" class="btn">View Appointment</a>
            <div class="footer">
              <p>© 2024 MediBook. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  welcome_email: {
    subject: 'Welcome to MediBook - Your Healthcare Journey Starts Here',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MediBook</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .feature-icon { font-size: 2em; margin-bottom: 10px; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Welcome to MediBook</h1>
            <p>Your healthcare journey starts here</p>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName},</h2>
            <p>Thank you for joining MediBook! We're excited to help you manage your healthcare needs with ease.</p>
            
            <h3>What you can do with MediBook:</h3>
            
            <div class="feature">
              <div class="feature-icon">📅</div>
              <h4>Book Appointments</h4>
              <p>Schedule appointments with top doctors in your area</p>
            </div>
            
            <div class="feature">
              <div class="feature-icon">👨‍⚕️</div>
              <h4>Find Doctors</h4>
              <p>Browse through verified doctors and specialists</p>
            </div>
            
            <div class="feature">
              <div class="feature-icon">💊</div>
              <h4>Manage Health</h4>
              <p>Keep track of your appointments and medical history</p>
            </div>
            
            <div class="feature">
              <div class="feature-icon">🔔</div>
              <h4>Stay Updated</h4>
              <p>Receive reminders and notifications for your appointments</p>
            </div>
            
            <a href="${data.dashboardUrl}" class="btn">Get Started</a>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <div class="footer">
              <p>© 2024 MediBook. All rights reserved.</p>
              <p>Your health, our priority.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Send email function
export const sendEmail = async (to, template, data, options = {}) => {
  try {
    const transporter = createTransporter();
    const emailTemplate = EMAIL_TEMPLATES[template];
    
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: options.subject || emailTemplate.subject,
      html: emailTemplate.html(data),
      ...options
    };

    const result = await transporter.sendMail(mailOptions);
    
    // Log email sent
    await logEmailSent(to, template, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      response: result
    };
  } catch (error) {
    console.error('Send email error:', error);
    
    // Log email failure
    await logEmailFailure(to, template, error.message);
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send notification email
export const sendNotificationEmail = async (userId, notificationId) => {
  try {
    // Get notification details
    const notificationQuery = `
      SELECT n.*, u.email, u.firstName, u.lastName,
             d.firstName as doctorFirstName, d.lastName as doctorLastName,
             a.date, a.time, a.reason, a.consultationFee
      FROM notifications n
      JOIN users u ON n.userId = u.id
      LEFT JOIN doctors d ON n.doctorId = d.id
      LEFT JOIN appointments a ON n.appointmentId = a.id
      WHERE n.id = ? AND u.email IS NOT NULL
    `;
    
    const notifications = await executeQuery(notificationQuery, [notificationId]);
    
    if (notifications.length === 0) {
      throw new Error('Notification not found or user has no email');
    }
    
    const notification = notifications[0];
    
    // Check if user has email notifications enabled
    const preferences = await getUserNotificationPreferences(userId);
    if (!preferences.email) {
      return { success: false, reason: 'Email notifications disabled' };
    }
    
    // Determine template based on notification type
    let template = 'appointment_booked'; // default
    let emailData = {
      firstName: notification.firstName,
      doctorFirstName: notification.doctorFirstName,
      doctorLastName: notification.doctorLastName,
      date: notification.date,
      time: notification.time,
      reason: notification.reason,
      consultationFee: notification.consultationFee,
      appointmentUrl: `${process.env.FRONTEND_URL}/appointments/${notification.appointmentId}`
    };
    
    switch (notification.type) {
      case 'appointment':
        if (notification.title.includes('Confirmed')) {
          template = 'appointment_confirmed';
        } else if (notification.title.includes('Cancelled')) {
          template = 'appointment_cancelled';
          emailData.cancelReason = notification.message;
        }
        break;
      case 'reminder':
        template = 'appointment_reminder';
        emailData.timeUntil = notification.message;
        emailData.location = 'Main Clinic';
        break;
    }
    
    const result = await sendEmail(notification.email, template, emailData);
    
    // Update notification to mark email as sent
    await executeQuery(
      'UPDATE notifications SET emailSent = TRUE, emailSentAt = NOW() WHERE id = ?',
      [notificationId]
    );
    
    return result;
  } catch (error) {
    console.error('Send notification email error:', error);
    throw error;
  }
};

// Send welcome email
export const sendWelcomeEmail = async (userId) => {
  try {
    const userQuery = `
      SELECT id, firstName, lastName, email
      FROM users 
      WHERE id = ? AND email IS NOT NULL
    `;
    
    const users = await executeQuery(userQuery, [userId]);
    
    if (users.length === 0) {
      throw new Error('User not found or has no email');
    }
    
    const user = users[0];
    
    const emailData = {
      firstName: user.firstName,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
    };
    
    const result = await sendEmail(user.email, 'welcome_email', emailData);
    
    // Update user to mark welcome email as sent
    await executeQuery(
      'UPDATE users SET welcomeEmailSent = TRUE, welcomeEmailSentAt = NOW() WHERE id = ?',
      [userId]
    );
    
    return result;
  } catch (error) {
    console.error('Send welcome email error:', error);
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

// Update user notification preferences
export const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const query = `
      INSERT INTO notification_preferences (userId, email, sms, push, inApp, appointmentReminders, marketingEmails, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      sms = VALUES(sms),
      push = VALUES(push),
      inApp = VALUES(inApp),
      appointmentReminders = VALUES(appointmentReminders),
      marketingEmails = VALUES(marketingEmails),
      updatedAt = VALUES(updatedAt)
    `;
    
    await executeQuery(query, [
      userId,
      preferences.email,
      preferences.sms,
      preferences.push,
      preferences.inApp,
      preferences.appointmentReminders,
      preferences.marketingEmails
    ]);
    
    return true;
  } catch (error) {
    console.error('Update notification preferences error:', error);
    throw error;
  }
};

// Log email sent
export const logEmailSent = async (to, template, messageId) => {
  try {
    const query = `
      INSERT INTO email_logs (recipient, template, messageId, status, sentAt)
      VALUES (?, ?, ?, 'sent', NOW())
    `;
    
    await executeQuery(query, [to, template, messageId]);
  } catch (error) {
    console.error('Log email sent error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Log email failure
export const logEmailFailure = async (to, template, errorMessage) => {
  try {
    const query = `
      INSERT INTO email_logs (recipient, template, status, error, sentAt)
      VALUES (?, ?, 'failed', ?, NOW())
    `;
    
    await executeQuery(query, [to, template, errorMessage]);
  } catch (error) {
    console.error('Log email failure error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Get email statistics
export const getEmailStats = async (period = '30') => {
  try {
    const periodDays = parseInt(period);
    const query = `
      SELECT 
        template,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*) * 100 as successRate
      FROM email_logs 
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY template
      ORDER BY total DESC
    `;
    
    const stats = await executeQuery(query, [periodDays]);
    
    return {
      period: `${periodDays} days`,
      stats
    };
  } catch (error) {
    console.error('Get email stats error:', error);
    throw error;
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Test email config error:', error);
    return { success: false, message: error.message };
  }
};

// Send bulk emails
export const sendBulkEmails = async (emails) => {
  try {
    const results = [];
    
    for (const email of emails) {
      try {
        const result = await sendEmail(email.to, email.template, email.data, email.options);
        results.push({ ...email, success: true, result });
      } catch (error) {
        results.push({ ...email, success: false, error: error.message });
      }
    }
    
    return {
      total: emails.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Send bulk emails error:', error);
    throw error;
  }
};
