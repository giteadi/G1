'use strict';

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
      res.json(threats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getRecentThreats(req, res) {
    try {
      const hours = parseInt(req.query.hours) || 24;
      const threats = Threat.getRecent(hours);
      res.json(threats);
    } catch (e) {
      res.status(500).json({ error: e.message });
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
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async runScan(req, res) {
    try {
      const config = loadConfig();
      const scanner = new ScannerService(config);
      const deep = req.query.deep === 'true';
      const type = req.query.type || 'full'; // crypto, brute_force, ddos, malware, phishing, full
      
      const results = await scanner.fullScan(deep);
      
      // Filter results by type if specified
      let filteredResults = results;
      if (type !== 'full') {
        filteredResults = results.filter(r => {
          const msg = r.message?.toLowerCase() || '';
          switch(type) {
            case 'crypto':
              return msg.includes('process') || msg.includes('cpu') || msg.includes('miner');
            case 'brute_force':
              return msg.includes('ssh') || msg.includes('auth') || msg.includes('login');
            case 'ddos':
              return msg.includes('port') || msg.includes('connection') || msg.includes('network');
            case 'malware':
              return msg.includes('rootkit') || msg.includes('malware') || msg.includes('suspicious');
            case 'phishing':
              return msg.includes('domain') || msg.includes('url') || msg.includes('phishing');
            default:
              return true;
          }
        });
      }
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        scan_type: type,
        deep,
        total_checks: results.length,
        filtered_results: filteredResults.length,
        results: filteredResults
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
      res.json({ count: ips.length, ips });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = ThreatController;
