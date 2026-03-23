import { findOne, findMany, insert, update, deleteRecord, count } from '../config/db.js';

export class User {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.phone = data.phone;
    this.address = data.address;
    this.dateOfBirth = data.dateOfBirth;
    this.password = data.password;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.lastLogin = data.lastLogin;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get age() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      address: this.address,
      dateOfBirth: this.dateOfBirth,
      age: this.age,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }

  toJSONWithoutPassword() {
    const { password, ...userWithoutPassword } = this.toJSON();
    return userWithoutPassword;
  }
}

export class UserModel {
  static async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = ?';
      const user = await findOne(query, [id]);
      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = ?';
      const user = await findOne(query, [email]);
      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      const query = 'SELECT * FROM users WHERE phone = ?';
      const user = await findOne(query, [phone]);
      return user ? new User(user) : null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  }

  static async findAll(limit = 50, offset = 0) {
    try {
      const query = 'SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      const users = await findMany(query, [limit, offset]);
      return users.map(user => new User(user));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { password, ...userWithoutPassword } = userData;
      const result = await insert('users', userData);
      
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id, userData) {
    try {
      userData.updatedAt = new Date();
      const result = await update('users', userData, 'id = ?', [id]);
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteRecord('users', 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async updateLastLogin(id) {
    try {
      const result = await update('users', { lastLogin: new Date() }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  static async searchUsers(searchTerm, limit = 20) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR phone LIKE ?
        ORDER BY firstName, lastName
        LIMIT ?
      `;
      const searchPattern = `%${searchTerm}%`;
      const users = await findMany(query, [searchPattern, searchPattern, searchPattern, searchPattern, limit]);
      return users.map(user => new User(user));
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  static async getUserStats() {
    try {
      const totalUsers = await count('users');
      const usersWithLastLogin = await count('users', 'lastLogin IS NOT NULL');
      const recentUsers = await count('users', 'createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
      
      return {
        totalUsers,
        activeUsers: usersWithLastLogin,
        newUsers: recentUsers
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  static async updatePassword(id, hashedPassword) {
    try {
      const result = await update('users', { 
        password: hashedPassword, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  static async verifyEmail(id) {
    try {
      const result = await update('users', { 
        emailVerified: true, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }
}

export class UserFactory {
  static fromDatabase(data) {
    return new User(data);
  }

  static create(userData) {
    return new User({
      id: null,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      address: userData.address || null,
      dateOfBirth: userData.dateOfBirth || null,
      password: userData.password || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    });
  }
}
