import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/database.js';

export const findUserByEmail = async (email) => {
  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    const users = await executeQuery(query, [email]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    throw new Error('Error finding user by email');
  }
};

export const createUser = async (userData) => {
  try {
    const { firstName, lastName, email, password, phone } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const insertQuery = `
      INSERT INTO users (firstName, lastName, email, password, phone, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await executeQuery(insertQuery, [
      firstName, lastName, email, hashedPassword, phone
    ]);
    
    return result.insertId;
  } catch (error) {
    throw new Error('Error creating user');
  }
};

export const validatePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error validating password');
  }
};

export const updateLastLogin = async (userId) => {
  try {
    const query = 'UPDATE users SET lastLogin = NOW() WHERE id = ?';
    await executeQuery(query, [userId]);
  } catch (error) {
    throw new Error('Error updating last login');
  }
};
