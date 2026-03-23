// This file is deprecated. Use config/db.js instead.
// Keeping for backward compatibility.

export { pool, executeQuery, executeTransaction, findOne, findMany, insert, update, deleteRecord, count, closeConnection } from './db.js';
