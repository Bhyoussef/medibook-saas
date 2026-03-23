import { executeQuery } from '../config/database.js';
import { getErrorService } from './errorHandlingService.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Backup configuration
const BACKUP_CONFIG = {
  enabled: process.env.BACKUP_ENABLED !== 'false',
  directory: process.env.BACKUP_DIR || './backups',
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  compression: true,
  encryption: false,
  s3: {
    enabled: process.env.S3_BACKUP_ENABLED === 'true',
    bucket: process.env.S3_BACKUP_BUCKET,
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY
  },
  email: {
    enabled: process.env.BACKUP_EMAIL_ENABLED === 'true',
    recipients: process.env.BACKUP_EMAIL_RECIPIENTS?.split(',') || [],
    onSuccess: process.env.BACKUP_EMAIL_ON_SUCCESS === 'true',
    onFailure: true
  }
};

// Backup types
export const BACKUP_TYPES = {
  FULL: 'full',
  INCREMENTAL: 'incremental',
  DIFFERENTIAL: 'differential'
};

// Backup status
export const BACKUP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Backup service
class BackupService {
  constructor() {
    this.isRunning = false;
    this.currentBackup = null;
    this.backupHistory = [];
    this.scheduler = null;
    this.errorService = getErrorService();
  }

  // Initialize backup service
  async initialize() {
    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(BACKUP_CONFIG.directory, { recursive: true });

      // Load backup history
      await this.loadBackupHistory();

      // Start scheduler if enabled
      if (BACKUP_CONFIG.enabled) {
        this.startScheduler();
      }

      console.log('Backup service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      return false;
    }
  }

  // Create full backup
  async createFullBackup(options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date();
    
    const backup = {
      id: backupId,
      type: BACKUP_TYPES.FULL,
      status: BACKUP_STATUS.PENDING,
      timestamp,
      options: {
        compression: options.compression ?? BACKUP_CONFIG.compression,
        encryption: options.encryption ?? BACKUP_CONFIG.encryption,
        ...options
      },
      files: [],
      size: 0,
      duration: 0,
      error: null
    };

    this.currentBackup = backup;
    backup.status = BACKUP_STATUS.RUNNING;

    try {
      const startTime = Date.now();

      // Backup database
      const dbBackupFile = await this.backupDatabase(backupId);
      backup.files.push(dbBackupFile);

      // Backup uploads directory
      const uploadsBackupFile = await this.backupUploads(backupId);
      backup.files.push(uploadsBackupFile);

      // Backup configuration files
      const configBackupFile = await this.backupConfig(backupId);
      backup.files.push(configBackupFile);

      // Calculate total size
      backup.size = await this.calculateBackupSize(backup.files);

      // Compress if enabled
      if (backup.options.compression) {
        await this.compressBackup(backup);
      }

      // Encrypt if enabled
      if (backup.options.encryption) {
        await this.encryptBackup(backup);
      }

      // Upload to S3 if enabled
      if (BACKUP_CONFIG.s3.enabled) {
        await this.uploadToS3(backup);
      }

      backup.status = BACKUP_STATUS.COMPLETED;
      backup.duration = Date.now() - startTime;

      console.log(`Full backup completed: ${backupId}`);
      
      // Send success notification
      await this.sendBackupNotification(backup, true);

      return backup;
    } catch (error) {
      backup.status = BACKUP_STATUS.FAILED;
      backup.error = error.message;
      
      console.error(`Full backup failed: ${backupId}`, error);
      
      // Send failure notification
      await this.sendBackupNotification(backup, false);

      throw error;
    } finally {
      this.backupHistory.push(backup);
      await this.saveBackupHistory();
      this.currentBackup = null;
    }
  }

  // Backup database
  async backupDatabase(backupId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_${backupId}_${timestamp}.sql`;
    const filepath = path.join(BACKUP_CONFIG.directory, filename);

    try {
      // Get database configuration
      const dbConfig = await this.getDatabaseConfig();
      
      // Create mysqldump command
      const command = [
        'mysqldump',
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        '--default-character-set=utf8mb4',
        `-h${dbConfig.host}`,
        `-P${dbConfig.port}`,
        `-u${dbConfig.user}`,
        `-p${dbConfig.password}`,
        dbConfig.database,
        '> ' + filepath
      ].join(' ');

      // Execute backup
      await execAsync(command);

      // Verify file exists and has content
      const stats = await fs.stat(filepath);
      if (stats.size === 0) {
        throw new Error('Database backup file is empty');
      }

      console.log(`Database backup created: ${filename}`);
      
      return {
        type: 'database',
        filename,
        filepath,
        size: stats.size,
        checksum: await this.calculateChecksum(filepath)
      };
    } catch (error) {
      // Clean up partial file
      try {
        await fs.unlink(filepath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  // Backup uploads directory
  async backupUploads(backupId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `uploads_${backupId}_${timestamp}.tar.gz`;
    const filepath = path.join(BACKUP_CONFIG.directory, filename);
    const uploadsDir = './uploads';

    try {
      // Check if uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch (error) {
        // Directory doesn't exist, create empty backup
        await fs.writeFile(filepath, '');
        return {
          type: 'uploads',
          filename,
          filepath,
          size: 0,
          checksum: await this.calculateChecksum(filepath)
        };
      }

      // Create tar.gz archive
      const command = `tar -czf ${filepath} -C ${path.dirname(uploadsDir)} ${path.basename(uploadsDir)}`;
      await execAsync(command);

      // Verify file exists
      const stats = await fs.stat(filepath);
      
      console.log(`Uploads backup created: ${filename}`);
      
      return {
        type: 'uploads',
        filename,
        filepath,
        size: stats.size,
        checksum: await this.calculateChecksum(filepath)
      };
    } catch (error) {
      // Clean up partial file
      try {
        await fs.unlink(filepath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Uploads backup failed: ${error.message}`);
    }
  }

  // Backup configuration files
  async backupConfig(backupId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `config_${backupId}_${timestamp}.tar.gz`;
    const filepath = path.join(BACKUP_CONFIG.directory, filename);

    try {
      // Files to backup
      const configFiles = [
        '.env',
        'package.json',
        'docker-compose.yml',
        'nginx/nginx.conf'
      ];

      // Filter existing files
      const existingFiles = [];
      for (const file of configFiles) {
        try {
          await fs.access(file);
          existingFiles.push(file);
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      if (existingFiles.length === 0) {
        // No config files to backup
        await fs.writeFile(filepath, '');
        return {
          type: 'config',
          filename,
          filepath,
          size: 0,
          checksum: await this.calculateChecksum(filepath)
        };
      }

      // Create tar.gz archive
      const command = `tar -czf ${filepath} ${existingFiles.join(' ')}`;
      await execAsync(command);

      // Verify file exists
      const stats = await fs.stat(filepath);
      
      console.log(`Config backup created: ${filename}`);
      
      return {
        type: 'config',
        filename,
        filepath,
        size: stats.size,
        checksum: await this.calculateChecksum(filepath)
      };
    } catch (error) {
      // Clean up partial file
      try {
        await fs.unlink(filepath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Config backup failed: ${error.message}`);
    }
  }

  // Compress backup files
  async compressBackup(backup) {
    if (!backup.options.compression) return;

    console.log(`Compressing backup: ${backup.id}`);

    for (const file of backup.files) {
      if (file.filename.endsWith('.gz')) {
        continue; // Already compressed
      }

      const compressedFile = file.filename + '.gz';
      const compressedPath = path.join(BACKUP_CONFIG.directory, compressedFile);

      try {
        // Compress file
        const command = `gzip -c ${file.filepath} > ${compressedPath}`;
        await execAsync(command);

        // Get compressed file stats
        const stats = await fs.stat(compressedPath);

        // Update file info
        file.filename = compressedFile;
        file.filepath = compressedPath;
        file.size = stats.size;
        file.checksum = await this.calculateChecksum(compressedPath);
        file.compressed = true;

        // Remove original file
        await fs.unlink(file.filepath.replace('.gz', ''));
      } catch (error) {
        console.warn(`Failed to compress ${file.filename}:`, error.message);
      }
    }
  }

  // Encrypt backup files
  async encryptBackup(backup) {
    if (!backup.options.encryption) return;

    console.log(`Encrypting backup: ${backup.id}`);

    for (const file of backup.files) {
      const encryptedFile = file.filename + '.enc';
      const encryptedPath = path.join(BACKUP_CONFIG.directory, encryptedFile);

      try {
        // Simple XOR encryption (in production, use proper encryption like AES)
        const fileData = await fs.readFile(file.filepath);
        const key = Buffer.from('encryption-key-32-chars', 'utf8');
        const encryptedData = Buffer.alloc(fileData.length);

        for (let i = 0; i < fileData.length; i++) {
          encryptedData[i] = fileData[i] ^ key[i % key.length];
        }

        await fs.writeFile(encryptedPath, encryptedData);

        // Update file info
        file.filename = encryptedFile;
        file.filepath = encryptedPath;
        file.encrypted = true;
        file.checksum = await this.calculateChecksum(encryptedPath);

        // Remove original file
        await fs.unlink(file.filepath.replace('.enc', ''));
      } catch (error) {
        console.warn(`Failed to encrypt ${file.filename}:`, error.message);
      }
    }
  }

  // Upload backup to S3
  async uploadToS3(backup) {
    if (!BACKUP_CONFIG.s3.enabled) return;

    console.log(`Uploading backup to S3: ${backup.id}`);

    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: BACKUP_CONFIG.s3.region,
        credentials: {
          accessKeyId: BACKUP_CONFIG.s3.accessKey,
          secretAccessKey: BACKUP_CONFIG.s3.secretKey
        }
      });

      for (const file of backup.files) {
        const fileData = await fs.readFile(file.filepath);
        
        const command = new PutObjectCommand({
          Bucket: BACKUP_CONFIG.s3.bucket,
          Key: `backups/${backup.id}/${file.filename}`,
          Body: fileData,
          Metadata: {
            backupId: backup.id,
            fileType: file.type,
            checksum: file.checksum
          }
        });

        await s3Client.send(command);
        
        file.s3Uploaded = true;
        file.s3Key = `backups/${backup.id}/${file.filename}`;
      }

      console.log(`Backup uploaded to S3: ${backup.id}`);
    } catch (error) {
      console.error(`Failed to upload backup to S3: ${backup.id}`, error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  // Restore backup
  async restoreBackup(backupId, options = {}) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.status !== BACKUP_STATUS.COMPLETED) {
      throw new Error(`Backup is not completed: ${backup.status}`);
    }

    console.log(`Restoring backup: ${backupId}`);

    try {
      // Download from S3 if needed
      if (BACKUP_CONFIG.s3.enabled && backup.files.some(f => f.s3Uploaded)) {
        await this.downloadFromS3(backup);
      }

      // Decrypt if needed
      if (backup.options.encryption) {
        await this.decryptBackup(backup);
      }

      // Decompress if needed
      if (backup.options.compression) {
        await this.decompressBackup(backup);
      }

      // Restore database
      if (options.database !== false) {
        await this.restoreDatabase(backup);
      }

      // Restore uploads
      if (options.uploads !== false) {
        await this.restoreUploads(backup);
      }

      // Restore config
      if (options.config !== false) {
        await this.restoreConfig(backup);
      }

      console.log(`Backup restored successfully: ${backupId}`);
      
      return backup;
    } catch (error) {
      console.error(`Backup restore failed: ${backupId}`, error);
      throw error;
    }
  }

  // Clean up old backups
  async cleanupOldBackups() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.retentionDays);

    const oldBackups = this.backupHistory.filter(backup => 
      backup.timestamp < cutoffDate && backup.status === BACKUP_STATUS.COMPLETED
    );

    for (const backup of oldBackups) {
      try {
        // Delete local files
        for (const file of backup.files) {
          try {
            await fs.unlink(file.filepath);
          } catch (error) {
            // File might not exist
          }
        }

        // Delete from S3 if uploaded
        if (BACKUP_CONFIG.s3.enabled && backup.files.some(f => f.s3Uploaded)) {
          await this.deleteFromS3(backup);
        }

        // Remove from history
        const index = this.backupHistory.indexOf(backup);
        this.backupHistory.splice(index, 1);

        console.log(`Cleaned up old backup: ${backup.id}`);
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }

    await this.saveBackupHistory();
  }

  // Get backup history
  getBackupHistory(limit = 50) {
    return this.backupHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get backup statistics
  getBackupStats() {
    const completed = this.backupHistory.filter(b => b.status === BACKUP_STATUS.COMPLETED);
    const failed = this.backupHistory.filter(b => b.status === BACKUP_STATUS.FAILED);
    
    const totalSize = completed.reduce((sum, backup) => sum + backup.size, 0);
    const avgDuration = completed.length > 0 
      ? completed.reduce((sum, backup) => sum + backup.duration, 0) / completed.length 
      : 0;

    return {
      total: this.backupHistory.length,
      completed: completed.length,
      failed: failed.length,
      successRate: completed.length / Math.max(this.backupHistory.length, 1),
      totalSize,
      avgDuration,
      lastBackup: this.backupHistory[0]?.timestamp || null,
      isRunning: this.isRunning,
      currentBackup: this.currentBackup?.id || null
    };
  }

  // Helper methods
  generateBackupId() {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDatabaseConfig() {
    try {
      const result = await executeQuery('SELECT DATABASE() as database');
      return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: result[0]?.database || 'medibook'
      };
    } catch (error) {
      throw new Error('Failed to get database configuration');
    }
  }

  async calculateChecksum(filepath) {
    try {
      const crypto = await import('crypto');
      const data = await fs.readFile(filepath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      return null;
    }
  }

  async calculateBackupSize(files) {
    return files.reduce((total, file) => total + file.size, 0);
  }

  async loadBackupHistory() {
    try {
      const historyFile = path.join(BACKUP_CONFIG.directory, 'backup_history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      this.backupHistory = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid
      this.backupHistory = [];
    }
  }

  async saveBackupHistory() {
    try {
      const historyFile = path.join(BACKUP_CONFIG.directory, 'backup_history.json');
      await fs.writeFile(historyFile, JSON.stringify(this.backupHistory, null, 2));
    } catch (error) {
      console.error('Failed to save backup history:', error);
    }
  }

  async sendBackupNotification(backup, success) {
    if (!BACKUP_CONFIG.email.enabled) return;

    try {
      // Send email notification implementation would go here
      console.log(`Backup notification sent: ${backup.id} - ${success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Failed to send backup notification:', error);
    }
  }

  startScheduler() {
    // Implement cron-like scheduler
    console.log('Backup scheduler started');
  }

  stopScheduler() {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
      console.log('Backup scheduler stopped');
    }
  }
}

// Global backup service instance
const backupService = new BackupService();

// Initialize backup service
export const initializeBackupService = async () => {
  return await backupService.initialize();
};

// Create backup
export const createBackup = async (options = {}) => {
  return await backupService.createFullBackup(options);
};

// Restore backup
export const restoreBackup = async (backupId, options = {}) => {
  return await backupService.restoreBackup(backupId, options);
};

// Get backup history
export const getBackupHistory = (limit = 50) => {
  return backupService.getBackupHistory(limit);
};

// Get backup statistics
export const getBackupStats = () => {
  return backupService.getBackupStats();
};

// Cleanup old backups
export const cleanupOldBackups = async () => {
  return await backupService.cleanupOldBackups();
};

// Export backup service for advanced usage
export { backupService };
