'use strict';

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const Threat = require('../models/Threat');
const BlockedIP = require('../models/BlockedIP');
const ScannerService = require('../services/ScannerService');
const CleanerService = require('../services/CleanerService');
const { loadConfig } = require('../config');

class ThreatController {
  static async getAllThreats(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const threats = Threat.getAll(limit);
      res.json({ success: true, count: threats.length, threats });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getRecentThreats(req, res) {
    try {
      const hours = parseInt(req.query.hours) || 24;
      const threats = Threat.getRecent(hours);
      res.json({ success: true, count: threats.length, threats });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async getThreatById(req, res) {
    try {
      const threat = Threat.getById(req.params.id);
      if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
      }
      res.json(threat);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = Threat.getStats();
      res.json({ success: true, ...stats });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async runScan(req, res) {
    try {
      const config = loadConfig();
      const scanner = new ScannerService(config);
      const deep = req.query.deep === 'true';
      const type = req.query.type || 'full'; // crypto, rootkit, cron, ports, ssh, privacy, darkweb, protection, full

      const results = await scanner.fullScan(deep, type);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        scan_type: type,
        deep,
        total_checks: results.length,
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async cleanThreats(req, res) {
    try {
      const config = loadConfig();
      const cleaner = new CleanerService(config);
      const force = req.query.force === 'true';
      
      const results = await cleaner.clean(force);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async markCleaned(req, res) {
    try {
      const { id } = req.params;
      const threat = Threat.markCleaned(id);
      
      if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
      }
      
      res.json({ success: true, threat });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async blockIP(req, res) {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }

      const success = BlockedIP.add(ip);
      
      res.json({
        success,
        message: success ? `${ip} blocked` : `Failed to block ${ip}`
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async unblockIP(req, res) {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }

      const success = BlockedIP.remove(ip);
      
      res.json({
        success,
        message: success ? `${ip} unblocked` : `Failed to unblock ${ip}`
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getBlockedIPs(req, res) {
    try {
      const ips = BlockedIP.getAll();
      res.json({ success: true, count: ips.length, ips });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async clearAllThreats(req, res) {
    try {
      const result = Threat.clearAll();
      res.json({
        success: true,
        message: 'All threats cleared from database',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async clearThreatsByType(req, res) {
    try {
      const { type } = req.body;
      if (!type) {
        return res.status(400).json({ error: 'Threat type required' });
      }
      
      const result = Threat.clearByType(type);
      res.json({
        success: true,
        message: `All ${type} threats cleared`,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async killProcess(req, res) {
    try {
      const { pid } = req.body;
      if (!pid) {
        return res.status(400).json({ error: 'PID required' });
      }

      // Validate PID is a number
      const processId = parseInt(pid);
      if (isNaN(processId) || processId <= 0) {
        return res.status(400).json({ error: 'Invalid PID' });
      }

      try {
        // Try to kill the process
        await execPromise(`kill -9 ${processId}`);
        res.json({
          success: true,
          message: `Process ${processId} killed successfully`
        });
      } catch (killError) {
        // Process might not exist or permission denied
        res.status(400).json({
          success: false,
          error: killError.message || 'Failed to kill process'
        });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = ThreatController;
