import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration for PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new pg.Pool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Execute query with prepared statements
const executeQuery = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { query, params } of queries) {
      const result = await client.query(query, params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw new Error(`Transaction failed: ${error.message}`);
  } finally {
    client.release();
  }
};

// Get single record
const findOne = async (query, params = []) => {
  try {
    const rows = await executeQuery(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Find one error:', error);
    throw error;
  }
};

// Get multiple records
const findMany = async (query, params = []) => {
  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.error('Find many error:', error);
    throw error;
  }
};

// Insert record
const insert = async (table, data) => {
  try {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
    const result = await executeQuery(query, values);
    
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
};

// Update record
const update = async (table, data, whereClause, whereParams = []) => {
  try {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await executeQuery(query, values);
    
    return {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows
    };
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
};

// Delete record
const deleteRecord = async (table, whereClause, whereParams = []) => {
  try {
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await executeQuery(query, whereParams);
    
    return {
      affectedRows: result.affectedRows
    };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

// Count records
const count = async (table, whereClause = '1=1', whereParams = []) => {
  try {
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    const result = await findOne(query, whereParams);
    return result.count;
  } catch (error) {
    console.error('Count error:', error);
    throw error;
  }
};

// Close connection pool
const closeConnection = async () => {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing connection pool:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

// Initialize connection
testConnection();

export {
  pool,
  executeQuery,
  executeTransaction,
  findOne,
  findMany,
  insert,
  update,
  deleteRecord,
  count,
  closeConnection
};
