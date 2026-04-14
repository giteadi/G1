'use strict';

const si = require('systeminformation');
const Threat = require('../models/Threat');
const BlockedIP = require('../models/BlockedIP');
const { loadConfig } = require('../config');

// Cache for network speed calculation
let _lastNet = null;
let _lastNetTime = null;

class StatusController {
  static async getStatus(req, res) {
    try {
      const stats = Threat.getStats();
      const config = loadConfig();

      res.json({
        status: 'active',
        uptime: process.uptime(),
        version: '1.0.0',
        threats: stats,
        blocked_ips: BlockedIP.getAll(),
        config: {
          auto_block: config.auto_block,
          auto_kill: config.auto_kill,
          monitor_interval: config.monitor_interval
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getMetrics(req, res) {
    try {
      const [cpu, mem, net, load] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.fullLoad()
      ]);

      // Calculate actual memory usage (excluding cached)
      // active = apps using now, wired = OS reserved, cached = can be freed
      const actualUsed = (mem.active || 0) + (mem.wired || 0);
      const ramPercent = Math.round((actualUsed / mem.total) * 100);
      
      res.json({
        cpu: Math.round(cpu.currentLoad),
        ram: ramPercent,
        ram_used_gb: (actualUsed / 1073741824).toFixed(1),
        ram_total_gb: (mem.total / 1073741824).toFixed(1),
        ram_cached_gb: ((mem.cached || 0) / 1073741824).toFixed(1),
        net_rx: net[0]?.rx_bytes || 0,
        net_tx: net[0]?.tx_bytes || 0,
        blocked_count: BlockedIP.size(),
        load_average: load,
        timestamp: Date.now()
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getSystemInfo(req, res) {
    try {
      const [os, cpu, mem, disk] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.fsSize()
      ]);

      res.json({
        os: {
          platform: os.platform,
          distro: os.distro,
          release: os.release,
          hostname: os.hostname
        },
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores
        },
        memory: {
          total: (mem.total / 1073741824).toFixed(1),
          used: (mem.used / 1073741824).toFixed(1)
        },
        disk: disk.map(d => ({
          fs: d.fs,
          size: (d.size / 1073741824).toFixed(1),
          used: (d.used / 1073741824).toFixed(1),
          use: d.use
        }))
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async updateConfig(req, res) {
    try {
      const { saveConfig, loadConfig } = require('../config');
      const currentConfig = loadConfig();
      const updates = req.body;
      
      // Merge updates with current config
      const newConfig = { ...currentConfig, ...updates };
      
      if (saveConfig(newConfig)) {
        res.json({
          success: true,
          message: 'Configuration updated',
          config: newConfig
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to save configuration'
        });
      }
    } catch (e) {
      res.status(500).json({
        success: false,
        error: e.message
      });
    }
  }
}

module.exports = StatusController;
