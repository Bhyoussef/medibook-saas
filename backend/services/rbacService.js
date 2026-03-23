import { executeQuery } from '../config/database.js';

// Define roles and permissions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  RECEPTIONIST: 'receptionist'
};

export const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Doctor management
  DOCTOR_CREATE: 'doctor:create',
  DOCTOR_READ: 'doctor:read',
  DOCTOR_UPDATE: 'doctor:update',
  DOCTOR_DELETE: 'doctor:delete',
  
  // Appointment management
  APPOINTMENT_CREATE: 'appointment:create',
  APPOINTMENT_READ: 'appointment:read',
  APPOINTMENT_UPDATE: 'appointment:update',
  APPOINTMENT_DELETE: 'appointment:delete',
  APPOINTMENT_CONFIRM: 'appointment:confirm',
  APPOINTMENT_CANCEL: 'appointment:cancel',
  
  // Calendar management
  CALENDAR_READ: 'calendar:read',
  CALENDAR_UPDATE: 'calendar:update',
  CALENDAR_MANAGE: 'calendar:manage',
  
  // Dashboard and analytics
  DASHBOARD_VIEW: 'dashboard:view',
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_GENERATE: 'reports:generate',
  
  // System management
  SYSTEM_CONFIG: 'system:config',
  AUDIT_LOGS: 'audit:logs',
  NOTIFICATIONS_MANAGE: 'notifications:manage'
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.ADMIN]: [
    // User management (except super admin)
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    
    // Doctor management
    PERMISSIONS.DOCTOR_CREATE,
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.DOCTOR_UPDATE,
    PERMISSIONS.DOCTOR_DELETE,
    
    // Appointment management
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_DELETE,
    PERMISSIONS.APPOINTMENT_CONFIRM,
    PERMISSIONS.APPOINTMENT_CANCEL,
    
    // Calendar management
    PERMISSIONS.CALENDAR_READ,
    PERMISSIONS.CALENDAR_UPDATE,
    PERMISSIONS.CALENDAR_MANAGE,
    
    // Dashboard and analytics
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    
    // System management
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.AUDIT_LOGS,
    PERMISSIONS.NOTIFICATIONS_MANAGE
  ],
  
  [ROLES.DOCTOR]: [
    // Limited user management
    PERMISSIONS.USER_READ,
    
    // Doctor self-management
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.DOCTOR_UPDATE,
    
    // Appointment management
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CONFIRM,
    PERMISSIONS.APPOINTMENT_CANCEL,
    
    // Calendar management
    PERMISSIONS.CALENDAR_READ,
    PERMISSIONS.CALENDAR_UPDATE,
    
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW
  ],
  
  [ROLES.PATIENT]: [
    // Self user management
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    
    // Appointment management (own appointments)
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    
    // Calendar read-only
    PERMISSIONS.CALENDAR_READ,
    
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW
  ],
  
  [ROLES.RECEPTIONIST]: [
    // User management
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    
    // Doctor management (read-only)
    PERMISSIONS.DOCTOR_READ,
    
    // Appointment management
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CONFIRM,
    PERMISSIONS.APPOINTMENT_CANCEL,
    
    // Calendar management
    PERMISSIONS.CALENDAR_READ,
    PERMISSIONS.CALENDAR_UPDATE,
    
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW
  ]
};

// Check if user has permission
export const hasPermission = (userRole, permission) => {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return userPermissions.includes(permission);
};

// Check if user has any of the specified permissions
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Check if user has all specified permissions
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Get user permissions
export const getUserPermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || [];
};

// Check if user can access resource
export const canAccessResource = (userRole, resource, action) => {
  const permission = `${resource}:${action}`;
  return hasPermission(userRole, permission);
};

// Get user role from database
export const getUserRole = async (userId) => {
  try {
    const query = `
      SELECT role FROM users WHERE id = ?
    `;
    
    const result = await executeQuery(query, [userId]);
    
    if (result.length === 0) {
      throw new Error('User not found');
    }
    
    return result[0].role;
  } catch (error) {
    console.error('Get user role error:', error);
    throw error;
  }
};

// Update user role (admin only)
export const updateUserRole = async (adminId, targetUserId, newRole) => {
  try {
    // Validate new role
    if (!Object.values(ROLES).includes(newRole)) {
      throw new Error('Invalid role');
    }
    
    // Check if admin has permission
    const adminRole = await getUserRole(adminId);
    if (!hasPermission(adminRole, PERMISSIONS.USER_UPDATE)) {
      throw new Error('Insufficient permissions to update user role');
    }
    
    // Prevent self-role modification for non-super admins
    if (adminId === targetUserId && adminRole !== ROLES.SUPER_ADMIN) {
      throw new Error('Cannot modify your own role');
    }
    
    // Check if target user is higher role
    const targetUserRole = await getUserRole(targetUserId);
    const roleHierarchy = {
      [ROLES.SUPER_ADMIN]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.DOCTOR]: 2,
      [ROLES.RECEPTIONIST]: 2,
      [ROLES.PATIENT]: 1
    };
    
    if (roleHierarchy[targetUserRole] >= roleHierarchy[adminRole] && adminRole !== ROLES.SUPER_ADMIN) {
      throw new Error('Cannot modify role of user with equal or higher role');
    }
    
    // Update role
    const updateQuery = `
      UPDATE users 
      SET role = ?, updatedAt = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [newRole, targetUserId]);
    
    // Log the role change
    await logRoleChange(adminId, targetUserId, targetUserRole, newRole);
    
    return true;
  } catch (error) {
    console.error('Update user role error:', error);
    throw error;
  }
};

// Get all users with their roles
export const getUsersWithRoles = async (adminId) => {
  try {
    // Check if admin has permission
    const adminRole = await getUserRole(adminId);
    if (!hasPermission(adminRole, PERMISSIONS.USER_READ)) {
      throw new Error('Insufficient permissions to view users');
    }
    
    const query = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.createdAt,
        u.lastLogin,
        CASE 
          WHEN u.lastLogin >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'active'
          WHEN u.lastLogin >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'inactive'
          ELSE 'dormant'
        END as status
      FROM users u
      ORDER BY u.createdAt DESC
    `;
    
    const users = await executeQuery(query);
    
    // Add permissions for each user
    return users.map(user => ({
      ...user,
      permissions: getUserPermissions(user.role)
    }));
  } catch (error) {
    console.error('Get users with roles error:', error);
    throw error;
  }
};

// Check resource ownership
export const checkResourceOwnership = async (userId, resourceType, resourceId) => {
  try {
    let query = '';
    let params = [userId];
    
    switch (resourceType) {
      case 'appointment':
        query = 'SELECT id FROM appointments WHERE userId = ? AND id = ?';
        params.push(resourceId);
        break;
        
      case 'doctor':
        query = 'SELECT id FROM doctors WHERE id = ? AND id = ?';
        params.push(resourceId);
        break;
        
      case 'user':
        return userId === resourceId;
        
      default:
        throw new Error('Invalid resource type');
    }
    
    const result = await executeQuery(query, params);
    return result.length > 0;
  } catch (error) {
    console.error('Check resource ownership error:', error);
    return false;
  }
};

// Log role changes for audit
export const logRoleChange = async (adminId, targetUserId, oldRole, newRole) => {
  try {
    const query = `
      INSERT INTO audit_logs (userId, action, resourceType, resourceId, oldValue, newValue, createdAt)
      VALUES (?, 'role_change', 'user', ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [adminId, targetUserId, oldRole, newRole]);
  } catch (error) {
    console.error('Log role change error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Check if user can perform action on resource
export const canPerformAction = async (userId, resourceType, resourceId, action) => {
  try {
    const userRole = await getUserRole(userId);
    const permission = `${resourceType}:${action}`;
    
    // Check if user has permission for the action
    if (!hasPermission(userRole, permission)) {
      return { allowed: false, reason: 'Insufficient permissions' };
    }
    
    // For patient role, check resource ownership
    if (userRole === ROLES.PATIENT) {
      const ownsResource = await checkResourceOwnership(userId, resourceType, resourceId);
      if (!ownsResource) {
        return { allowed: false, reason: 'Resource access denied' };
      }
    }
    
    // For doctor role, check if they own the resource (for appointments and doctor profile)
    if (userRole === ROLES.DOCTOR) {
      const ownsResource = await checkResourceOwnership(userId, resourceType, resourceId);
      if (!ownsResource && resourceType === 'appointment') {
        // Doctors can view appointments they're assigned to
        const appointmentQuery = 'SELECT id FROM appointments WHERE doctorId = ? AND id = ?';
        const result = await executeQuery(appointmentQuery, [userId, resourceId]);
        if (result.length === 0) {
          return { allowed: false, reason: 'Appointment access denied' };
        }
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Can perform action error:', error);
    return { allowed: false, reason: 'System error' };
  }
};

// Get role hierarchy level
export const getRoleLevel = (role) => {
  const hierarchy = {
    [ROLES.SUPER_ADMIN]: 4,
    [ROLES.ADMIN]: 3,
    [ROLES.DOCTOR]: 2,
    [ROLES.RECEPTIONIST]: 2,
    [ROLES.PATIENT]: 1
  };
  
  return hierarchy[role] || 0;
};

// Check if user can manage target user
export const canManageUser = async (managerId, targetUserId) => {
  try {
    if (managerId === targetUserId) {
      return { allowed: true, reason: 'Self-management' };
    }
    
    const managerRole = await getUserRole(managerId);
    const targetRole = await getUserRole(targetUserId);
    
    const managerLevel = getRoleLevel(managerRole);
    const targetLevel = getRoleLevel(targetRole);
    
    if (managerLevel <= targetLevel) {
      return { allowed: false, reason: 'Cannot manage user with equal or higher role' };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Can manage user error:', error);
    return { allowed: false, reason: 'System error' };
  }
};
