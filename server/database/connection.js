'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'g1_guardian',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;

async function initializeDatabase() {
    try {
        // Create connection without database to create it if not exists
        const conn = await mysql.createConnection({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password
        });

        await conn.query(`CREATE DATABASE IF NOT EXISTS ${DB_CONFIG.database}`);
        logger.info(`Database ${DB_CONFIG.database} ready`);
        await conn.end();

        // Create pool with database
        pool = mysql.createPool({
            ...DB_CONFIG,
            database: DB_CONFIG.database
        });

        // Run init SQL
        await runInitSQL();
        
        return pool;
    } catch (e) {
        logger.error(`Database init failed: ${e.message}`);
        throw e;
    }
}

async function runInitSQL() {
    const initFile = path.join(__dirname, 'init.sql');
    if (!fs.existsSync(initFile)) {
        logger.warn('init.sql not found');
        return;
    }

    const sql = fs.readFileSync(initFile, 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
        if (statement.trim()) {
            try {
                await pool.query(statement);
            } catch (e) {
                // Ignore duplicate errors
                if (!e.message.includes('Duplicate')) {
                    logger.debug(`SQL: ${e.message}`);
                }
            }
        }
    }
    logger.info('Database tables initialized');
}

function getPool() {
    if (!pool) {
        throw new Error('Database not initialized');
    }
    return pool;
}

module.exports = {
    initializeDatabase,
    getPool,
    DB_CONFIG
};
