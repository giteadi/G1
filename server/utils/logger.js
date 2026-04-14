'use strict';

const winston = require('winston');
const path = require('path');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(DATA_DIR, 'g1.log'),
      maxsize: 5242880,
      maxFiles: 3
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
