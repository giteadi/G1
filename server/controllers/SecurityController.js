'use strict';

const SecurityModules = require('../services/SecurityModules');
const { loadConfig } = require('../config');

class SecurityController {
  // Master scan - all modules
  static async masterScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);

      const results = await security.masterScan();

      res.json({
        success: true,
        ...results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // Individual module scans
  static async cryptoScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.cryptoMinerScan();

      res.json({
        success: true,
        module: 'crypto_miner',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async bruteForceScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.bruteForceScan();

      res.json({
        success: true,
        module: 'brute_force',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async ddosScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.ddosScan();

      res.json({
        success: true,
        module: 'ddos_guard',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async rootkitScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.rootkitScan();

      res.json({
        success: true,
        module: 'rootkit',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async cronScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.cronScan();

      res.json({
        success: true,
        module: 'suspicious_crons',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async portsScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.portsScan();

      res.json({
        success: true,
        module: 'open_ports',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async sshScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.sshScan();

      res.json({
        success: true,
        module: 'ssh_config',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async privacyScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.privacyScan();

      res.json({
        success: true,
        module: 'privacy_leaks',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async darkwebScan(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.darkwebScan();

      res.json({
        success: true,
        module: 'darkweb_c2',
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async systemMonitor(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.systemMonitor();

      res.json({
        success: true,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // Resolve endpoints
  static async resolveCrypto(req, res) {
    try {
      const { pid, process } = req.body;
      if (!pid || !process) {
        return res.status(400).json({ error: 'PID and process name required' });
      }

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.cryptoMinerResolve(pid, process);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolveBruteForce(req, res) {
    try {
      const { ip } = req.body;
      if (!ip) {
        return res.status(400).json({ error: 'IP required' });
      }

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.bruteForceResolve(ip);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolveDDoS(req, res) {
    try {
      const { ip } = req.body;

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.ddosResolve(ip);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolveCron(req, res) {
    try {
      const { path } = req.body;

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.cronResolve(path);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolvePort(req, res) {
    try {
      const { port, pid } = req.body;
      if (!port) {
        return res.status(400).json({ error: 'Port required' });
      }

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.portResolve(port, pid);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolveSSH(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.sshResolve();

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async resolveDarkweb(req, res) {
    try {
      const { ip, pid } = req.body;

      const config = loadConfig();
      const security = new SecurityModules(config);
      const result = await security.darkwebResolve(ip, pid);

      res.json({
        success: result.success,
        ...result
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // Auto-resolve all Level 2 and 3 threats
  static async autoResolve(req, res) {
    try {
      const config = loadConfig();
      const security = new SecurityModules(config);

      const scan = await security.masterScan();
      const resolved = [];
      const failed = [];

      // Resolve Level 3 (Attack) first
      for (const threat of scan.threats) {
        try {
          const result = await security.resolveThreat(threat);
          resolved.push({ finding: threat, result });
        } catch (e) {
          failed.push({ finding: threat, error: e.message });
        }
      }

      // Then Level 2 (Warnings) if force=true
      if (req.query.force === 'true') {
        for (const warning of scan.warnings) {
          try {
            const result = await security.resolveThreat(warning);
            resolved.push({ finding: warning, result });
          } catch (e) {
            failed.push({ finding: warning, error: e.message });
          }
        }
      }

      res.json({
        success: true,
        resolved: resolved.length,
        failed: failed.length,
        details: { resolved, failed }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = SecurityController;
