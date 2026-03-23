import { executeQuery } from '../config/database.js';

// SMS configuration
const SMS_CONFIG = {
  provider: process.env.SMS_PROVIDER || 'twilio', // twilio, nexmo, aws-sns
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER
  },
  nexmo: {
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET,
    from: process.env.NEXMO_PHONE_NUMBER
  },
  awsSns: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// SMS templates
const SMS_TEMPLATES = {
  appointment_booked: {
    message: (data) => `MediBook: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} is confirmed for ${new Date(data.date).toLocaleDateString()} at ${data.time}. Please arrive 15 minutes early.`
  },
  
  appointment_confirmed: {
    message: (data) => `MediBook: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} on ${new Date(data.date).toLocaleDateString()} at ${data.time} has been CONFIRMED.`
  },
  
  appointment_cancelled: {
    message: (data) => `MediBook: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} on ${new Date(data.date).toLocaleDateString()} at ${data.time} has been CANCELLED.`
  },
  
  appointment_reminder_24h: {
    message: (data) => `MediBook: Reminder: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} is TOMORROW at ${data.time}.`
  },
  
  appointment_reminder_2h: {
    message: (data) => `MediBook: Reminder: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} is TODAY at ${data.time}.`
  },
  
  appointment_reminder_1h: {
    message: (data) => `MediBook: Reminder: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} is in 1 HOUR at ${data.time}.`
  },
  
  appointment_reminder_30m: {
    message: (data) => `MediBook: Your appointment with Dr. ${data.doctorFirstName} ${data.doctorLastName} starts in 30 MINUTES at ${data.time}.`
  },
  
  otp_verification: {
    message: (data) => `MediBook: Your verification code is ${data.otp}. This code expires in 10 minutes.`
  },
  
  welcome_message: {
    message: (data) => `MediBook: Welcome ${data.firstName}! Your account has been created. Download our app to manage your appointments easily.`
  }
};

// Twilio SMS service
class TwilioSMS {
  constructor() {
    this.accountSid = SMS_CONFIG.twilio.accountSid;
    this.authToken = SMS_CONFIG.twilio.authToken;
    this.from = SMS_CONFIG.twilio.from;
  }

  async sendSMS(to, message) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const body = new URLSearchParams({
        To: to,
        From: this.from,
        Body: message
      });

      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send SMS');
      }

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        provider: 'twilio'
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }
}

// Nexmo (Vonage) SMS service
class NexmoSMS {
  constructor() {
    this.apiKey = SMS_CONFIG.nexmo.apiKey;
    this.apiSecret = SMS_CONFIG.nexmo.apiSecret;
    this.from = SMS_CONFIG.nexmo.from;
  }

  async sendSMS(to, message) {
    try {
      const url = `https://rest.nexmo.com/sms/json`;
      
      const body = {
        from: this.from,
        to: to,
        text: message,
        type: 'text'
      };

      const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!response.ok || result.messages[0].status !== '0') {
        throw new Error(result.messages[0]['error-text'] || 'Failed to send SMS');
      }

      return {
        success: true,
        messageId: result.messages[0]['message-id'],
        status: result.messages[0].status,
        provider: 'nexmo'
      };
    } catch (error) {
      console.error('Nexmo SMS error:', error);
      throw error;
    }
  }
}

// AWS SNS SMS service
class AWSSNSSMS {
  constructor() {
    this.region = SMS_CONFIG.awsSns.region;
    this.accessKeyId = SMS_CONFIG.awsSns.accessKeyId;
    this.secretAccessKey = SMS_CONFIG.awsSns.secretAccessKey;
  }

  async sendSMS(to, message) {
    try {
      const url = `https://sns.${this.region}.amazonaws.com/`;
      
      const body = {
        Action: 'Publish',
        Version: '2010-03-31',
        PhoneNumber: to,
        Message: message,
        MessageStructure: 'string'
      };

      const auth = this.getAWSAuth();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Amz-Target': 'AmazonSNS',
          'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
          'Host': `sns.${this.region}.amazonaws.com`
        },
        body: new URLSearchParams(body).toString()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.Error?.Message || 'Failed to send SMS');
      }

      return {
        success: true,
        messageId: result.PublishResult.MessageId,
        provider: 'aws-sns'
      };
    } catch (error) {
      console.error('AWS SNS SMS error:', error);
      throw error;
    }
  }

  getAWSAuth() {
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const service = 'sns';
    const region = this.region;
    
    const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${region}/${service}/aws4_request\n${this.getCanonicalRequest()}`;
    const signingKey = this.getSigningKey(date, region, service);
    const signature = this.hmacSHA256(stringToSign, signingKey);
    
    return `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${date}/${region}/${service}/aws4_request, SignedHeaders=host;x-amz-date, Signature=${signature}`;
  }

  getCanonicalRequest() {
    return 'POST\n/\nhost:sns.amazonaws.com\nx-amz-date:' + new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '') + '\nhost;x-amz-date\n' + this.getHashedPayload();
  }

  getHashedPayload() {
    return this.sha256('Action=Publish&Message=...&PhoneNumber=...&Version=2010-03-31');
  }

  getSigningKey(date, region, service) {
    const kDate = this.hmacSHA256(date, 'AWS4' + this.secretAccessKey);
    const kRegion = this.hmacSHA256(region, kDate);
    const kService = this.hmacSHA256(service, kRegion);
    const kSigning = this.hmacSHA256('aws4_request', kService);
    return kSigning;
  }

  hmacSHA256(data, key) {
    // This is a simplified version - in production, use crypto.createHmac
    return Buffer.from('hashed').toString('base64');
  }

  sha256(data) {
    // This is a simplified version - in production, use crypto.createHash
    return Buffer.from('hashed').toString('hex');
  }
}

// Get SMS provider instance
const getSMSProvider = () => {
  switch (SMS_CONFIG.provider) {
    case 'twilio':
      return new TwilioSMS();
    case 'nexmo':
      return new NexmoSMS();
    case 'aws-sns':
      return new AWSSNSSMS();
    default:
      throw new Error(`Unsupported SMS provider: ${SMS_CONFIG.provider}`);
  }
};

// Send SMS function
export const sendSMS = async (to, template, data, options = {}) => {
  try {
    // Validate phone number
    if (!to || typeof to !== 'string') {
      throw new Error('Valid phone number is required');
    }

    // Format phone number (remove spaces, dashes, parentheses)
    const formattedPhone = to.replace(/[\s\-\(\)]/g, '');
    
    // Get SMS template
    const smsTemplate = SMS_TEMPLATES[template];
    
    if (!smsTemplate) {
      throw new Error(`SMS template '${template}' not found`);
    }

    const message = smsTemplate.message(data);
    
    // Validate message length
    if (message.length > 160) {
      console.warn(`SMS message exceeds 160 characters (${message.length} chars)`);
    }

    const provider = getSMSProvider();
    const result = await provider.sendSMS(formattedPhone, message);
    
    // Log SMS sent
    await logSMSSent(formattedPhone, template, result.messageId);
    
    return {
      success: true,
      ...result,
      message: message.substring(0, 50) + '...' // Log truncated message
    };
  } catch (error) {
    console.error('Send SMS error:', error);
    
    // Log SMS failure
    await logSMSFailure(to, template, error.message);
    
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

// Send notification SMS
export const sendNotificationSMS = async (userId, notificationId) => {
  try {
    // Get notification details
    const notificationQuery = `
      SELECT n.*, u.phone, u.firstName, u.lastName,
             d.firstName as doctorFirstName, d.lastName as doctorLastName,
             a.date, a.time
      FROM notifications n
      JOIN users u ON n.userId = u.id
      LEFT JOIN doctors d ON n.doctorId = d.id
      LEFT JOIN appointments a ON n.appointmentId = a.id
      WHERE n.id = ? AND u.phone IS NOT NULL
    `;
    
    const notifications = await executeQuery(notificationQuery, [notificationId]);
    
    if (notifications.length === 0) {
      throw new Error('Notification not found or user has no phone number');
    }
    
    const notification = notifications[0];
    
    // Check if user has SMS notifications enabled
    const preferences = await getUserNotificationPreferences(userId);
    if (!preferences.sms) {
      return { success: false, reason: 'SMS notifications disabled' };
    }
    
    // Determine template based on notification type
    let template = 'appointment_booked'; // default
    let smsData = {
      doctorFirstName: notification.doctorFirstName,
      doctorLastName: notification.doctorLastName,
      date: notification.date,
      time: notification.time
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
        // Determine reminder type based on message content
        if (notification.message.includes('tomorrow')) {
          template = 'appointment_reminder_24h';
        } else if (notification.message.includes('in 1 hour')) {
          template = 'appointment_reminder_1h';
        } else if (notification.message.includes('in 30 minutes')) {
          template = 'appointment_reminder_30m';
        } else {
          template = 'appointment_reminder_2h';
        }
        break;
    }
    
    const result = await sendSMS(notification.phone, template, smsData);
    
    // Update notification to mark SMS as sent
    await executeQuery(
      'UPDATE notifications SET smsSent = TRUE, smsSentAt = NOW() WHERE id = ?',
      [notificationId]
    );
    
    return result;
  } catch (error) {
    console.error('Send notification SMS error:', error);
    throw error;
  }
};

// Send OTP via SMS
export const sendOTPSMS = async (phone, otp) => {
  try {
    const result = await sendSMS(phone, 'otp_verification', { otp });
    
    // Log OTP sent
    await logOTPSent(phone, result.messageId);
    
    return result;
  } catch (error) {
    console.error('Send OTP SMS error:', error);
    throw error;
  }
};

// Send welcome SMS
export const sendWelcomeSMS = async (userId) => {
  try {
    const userQuery = `
      SELECT id, firstName, lastName, phone
      FROM users 
      WHERE id = ? AND phone IS NOT NULL
    `;
    
    const users = await executeQuery(userQuery, [userId]);
    
    if (users.length === 0) {
      throw new Error('User not found or has no phone number');
    }
    
    const user = users[0];
    
    const result = await sendSMS(user.phone, 'welcome_message', { firstName: user.firstName });
    
    // Update user to mark welcome SMS as sent
    await executeQuery(
      'UPDATE users SET welcomeSmsSent = TRUE, welcomeSmsSentAt = NOW() WHERE id = ?',
      [userId]
    );
    
    return result;
  } catch (error) {
    console.error('Send welcome SMS error:', error);
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

// Log SMS sent
export const logSMSSent = async (to, template, messageId) => {
  try {
    const query = `
      INSERT INTO sms_logs (recipient, template, messageId, status, sentAt)
      VALUES (?, ?, ?, 'sent', NOW())
    `;
    
    await executeQuery(query, [to, template, messageId]);
  } catch (error) {
    console.error('Log SMS sent error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Log SMS failure
export const logSMSFailure = async (to, template, errorMessage) => {
  try {
    const query = `
      INSERT INTO sms_logs (recipient, template, status, error, sentAt)
      VALUES (?, ?, 'failed', ?, NOW())
    `;
    
    await executeQuery(query, [to, template, errorMessage]);
  } catch (error) {
    console.error('Log SMS failure error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Log OTP sent
export const logOTPSent = async (phone, messageId) => {
  try {
    const query = `
      INSERT INTO otp_logs (phone, messageId, sentAt)
      VALUES (?, ?, NOW())
    `;
    
    await executeQuery(query, [phone, messageId]);
  } catch (error) {
    console.error('Log OTP sent error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Get SMS statistics
export const getSMSStats = async (period = '30') => {
  try {
    const periodDays = parseInt(period);
    const query = `
      SELECT 
        template,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*) * 100 as successRate
      FROM sms_logs 
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
    console.error('Get SMS stats error:', error);
    throw error;
  }
};

// Test SMS configuration
export const testSMSConfig = async () => {
  try {
    const provider = getSMSProvider();
    
    // Try to send a test SMS (in production, this would go to a test number)
    const testPhone = process.env.TEST_PHONE_NUMBER || '+1234567890';
    const testMessage = 'Test SMS from MediBook';
    
    const result = await provider.sendSMS(testPhone, testMessage);
    
    return { 
      success: true, 
      message: 'SMS configuration is valid',
      provider: SMS_CONFIG.provider
    };
  } catch (error) {
    console.error('Test SMS config error:', error);
    return { success: false, message: error.message };
  }
};

// Send bulk SMS
export const sendBulkSMS = async (smsList) => {
  try {
    const results = [];
    
    for (const sms of smsList) {
      try {
        const result = await sendSMS(sms.to, sms.template, sms.data, sms.options);
        results.push({ ...sms, success: true, result });
      } catch (error) {
        results.push({ ...sms, success: false, error: error.message });
      }
    }
    
    return {
      total: smsList.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Send bulk SMS error:', error);
    throw error;
  }
};

// Validate phone number format
export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  // Basic international format validation
  if (digitsOnly.length === 10 && !phone.startsWith('+')) {
    // Assume US number if 10 digits without country code
    return { valid: true, formatted: `+1${digitsOnly}` };
  }

  if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    // International number
    return { valid: true, formatted: `+${digitsOnly}` };
  }

  return { valid: false, error: 'Invalid phone number format' };
};
