import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/database.js';

export const getUserProfile = async (req, res) => {
  try {
    const query = `
      SELECT id, firstName, lastName, email, phone, address, createdAt
      FROM users
      WHERE id = ?
    `;
    const users = await executeQuery(query, [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address } = req.body;
    
    const updateQuery = `
      UPDATE users
      SET firstName = ?, lastName = ?, email = ?, phone = ?, address = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      firstName, lastName, email, phone, address, req.user.id
    ]);
    
    const userQuery = `
      SELECT id, firstName, lastName, email, phone, address, createdAt
      FROM users
      WHERE id = ?
    `;
    const users = await executeQuery(userQuery, [req.user.id]);
    
    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const userQuery = 'SELECT password FROM users WHERE id = ?';
    const users = await executeQuery(userQuery, [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    const updateQuery = `
      UPDATE users
      SET password = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [hashedNewPassword, req.user.id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
