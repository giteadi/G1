'use strict';

const { loadConfig } = require('./config');
const logger = require('./utils/logger');
const MonitorService = require('./services/MonitorService');

const config = loadConfig();

// Validate config
if (!config.openai_key) {
  logger.error('OPENAI_API_KEY not configured. Set it in ~/.g1/config.json or OPENAI_API_KEY env var.');
  process.exit(1);
}

logger.info('G1 Guardian Daemon starting...');
logger.info(`Config loaded from: ${require('./config').CONFIG_PATH}`);

// Start monitoring
const monitor = new MonitorService(config);
monitor.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  monitor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  monitor.stop();
  process.exit(0);
});

// Keep process alive
setInterval(() => {}, 1000);
