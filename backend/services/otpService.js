import { executeQuery } from '../config/database.js';

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (phone) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    // Clean up old OTPs for this phone
    await executeQuery(
      'DELETE FROM otp_codes WHERE phone = ? OR expiresAt < NOW()',
      [phone]
    );
    
    // Store new OTP
    await executeQuery(
      'INSERT INTO otp_codes (phone, code, expiresAt) VALUES (?, ?, ?)',
      [phone, code, expiresAt]
    );
    
    // Log OTP to console (in production, this would send via SMS)
    console.log(`🔐 OTP for ${phone}: ${code}`);
    console.log(`⏰ Expires at: ${expiresAt.toLocaleString()}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt
    };
  } catch (error) {
    console.error('Send OTP error:', error);
    throw new Error('Failed to send OTP');
  }
};

export const verifyOTP = async (phone, code) => {
  try {
    const query = `
      SELECT * FROM otp_codes 
      WHERE phone = ? AND code = ? AND isUsed = FALSE AND expiresAt > NOW()
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    
    const otps = await executeQuery(query, [phone, code]);
    
    if (otps.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }
    
    const otp = otps[0];
    
    // Mark OTP as used
    await executeQuery(
      'UPDATE otp_codes SET isUsed = TRUE WHERE id = ?',
      [otp.id]
    );
    
    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw new Error('Failed to verify OTP');
  }
};

export const findUserByPhone = async (phone) => {
  try {
    const query = 'SELECT * FROM users WHERE phone = ?';
    const users = await executeQuery(query, [phone]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Find user by phone error:', error);
    throw new Error('Error finding user by phone');
  }
};

export const createUserFromPhone = async (phone, userData) => {
  try {
    const { firstName, lastName, email, dateOfBirth } = userData;
    
    const insertQuery = `
      INSERT INTO users (firstName, lastName, email, phone, dateOfBirth, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await executeQuery(insertQuery, [
      firstName, lastName, email, phone, dateOfBirth
    ]);
    
    const userQuery = 'SELECT * FROM users WHERE id = ?';
    const users = await executeQuery(userQuery, [result.insertId]);
    
    return users[0];
  } catch (error) {
    console.error('Create user from phone error:', error);
    throw new Error('Error creating user from phone');
  }
};
