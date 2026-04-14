'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.G1_CONFIG || path.join(process.env.HOME || '/root', '.g1', 'config.json');
const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');

// Default configuration
const defaultConfig = {
  openai_key: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  dashboard_port: 3000,
  monitor_interval: 30,
  scan_interval: 300,
  auto_block: true,
  auto_kill: false,
  whitelist_ips: [],
  alert_email: null,
  slack_webhook: null,
  log_level: 'info'
};

function loadConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG_PATH)) {
      const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...defaultConfig, ...userConfig };
    }

    // Create default config file if doesn't exist
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  } catch (e) {
    console.error('Failed to load config:', e.message);
    return defaultConfig;
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save config:', e.message);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  defaultConfig,
  CONFIG_PATH,
  DATA_DIR
};
