'use strict';

const ServerProtection = require('../services/ServerProtection');
const CryptoDetector = require('../services/CryptoDetector');
const { loadConfig } = require('../config');

class ProtectionController {
  static async getStatus(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const status = await protection.getActiveProtectionStatus();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...status
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async enableFirewall(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.enableFirewall();

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        message: result.success ? 'Firewall enabled' : 'Failed to enable firewall',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async enableFail2ban(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.enableFail2ban();

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        message: result.success ? 'Fail2ban enabled' : 'Failed to enable fail2ban',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async hardenSSH(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.hardenSSH();

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        message: result.success ? 'SSH hardened' : 'Failed to harden SSH',
        warning: 'SSH service will be restarted. Ensure you have key-based access configured.',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async blockIP(req, res) {
    try {
      const { ip, reason } = req.body;
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }

      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.blockIP(ip, reason || 'manual');

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        ...result
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

      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.unblockIP(ip);

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async isolateProcess(req, res) {
    try {
      const { pid, action } = req.body;
      if (!pid) {
        return res.status(400).json({ error: 'PID required' });
      }

      const config = loadConfig();
      const detector = new CryptoDetector(config);

      let result;
      if (action === 'kill') {
        result = await detector.terminateProcess(parseInt(pid));
      } else {
        result = await detector.isolateProcess(parseInt(pid));
      }

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        action: result.action,
        pid: parseInt(pid)
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async applyFullProtection(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const results = [];

      const firewall = await protection.enableFirewall();
      results.push({ module: 'firewall', ...firewall });

      const fail2ban = await protection.enableFail2ban();
      results.push({ module: 'fail2ban', ...fail2ban });

      const ssh = await protection.hardenSSH();
      results.push({ module: 'ssh', ...ssh });

      const honeypot = await protection.applyHoneypot();
      results.push({ module: 'honeypot', ...honeypot });

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Full protection applied',
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async scanVulnerabilities(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const vulnerabilities = await protection.scanForVulnerabilities();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        count: vulnerabilities.length,
        vulnerabilities
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async enableAutoRemediation(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.enableAutoRemediation();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        auto_remediate: true,
        message: 'Auto-remediation enabled for critical threats'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async disableAutoRemediation(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.disableAutoRemediation();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        auto_remediate: false,
        message: 'Auto-remediation disabled'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async networkIsolate(req, res) {
    try {
      const { pid } = req.body;
      if (!pid) {
        return res.status(400).json({ error: 'PID required' });
      }

      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.isolateNetwork(parseInt(pid));

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async getSSHStatus(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const sshStatus = await protection.checkSSHConfig();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...sshStatus
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async deployHoneypot(req, res) {
    try {
      const config = loadConfig();
      const protection = new ServerProtection(config);
      const result = await protection.applyHoneypot();

      res.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = ProtectionController;
