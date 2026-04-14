'use strict';

const { execSync } = require('child_process');
const Threat = require('../models/Threat');
const BlockedIP = require('../models/BlockedIP');
const logger = require('../utils/logger');

class CleanerService {
  constructor(config) {
    this.config = config;
  }

  async clean(force = false) {
    const threats = Threat.getAll(1000).filter(t => !t.cleaned && t.severity !== 'low');
    const results = [];

    for (const threat of threats) {
      const result = await this.handleThreat(threat, force);
      results.push(result);
      Threat.markCleaned(threat.id);
    }

    if (results.length === 0) {
      results.push({ success: true, action: 'No unhandled threats found — server is clean' });
    }

    return results;
  }

  async handleThreat(threat, force) {
    try {
      switch (threat.type) {
        case 'crypto_mining':
        case 'crypto_mining_suspected':
          if (threat.pid) {
            execSync(`kill -9 ${threat.pid} 2>/dev/null || true`);
            logger.warn(`Killed miner process PID ${threat.pid}`);
            return { success: true, action: `Killed miner process PID ${threat.pid}` };
          }
          return { success: true, action: 'Crypto mining threat logged' };

        case 'brute_force':
          if (threat.attacker_ip) {
            BlockedIP.add(threat.attacker_ip, this.config.whitelist_ips);
            logger.warn(`Blocked attacker IP: ${threat.attacker_ip}`);
            return { success: true, action: `Blocked attacker IP: ${threat.attacker_ip}` };
          }
          return { success: true, action: 'Brute force threat logged' };

        case 'suspicious_connection':
          if (threat.attacker_ip) {
            BlockedIP.add(threat.attacker_ip, this.config.whitelist_ips);
            return { success: true, action: `Blocked suspicious IP: ${threat.attacker_ip}` };
          }
          return { success: true, action: 'Connection threat logged' };

        case 'high_cpu_process':
          if (threat.pid && force) {
            execSync(`kill -9 ${threat.pid} 2>/dev/null || true`);
            return { success: true, action: `Killed high CPU process PID ${threat.pid}` };
          }
          return { success: true, action: `High CPU process logged (PID: ${threat.pid})` };

        default:
          return { success: true, action: `Threat ${threat.type} marked as reviewed` };
      }
    } catch (e) {
      logger.error(`Failed to handle ${threat.type}: ${e.message}`);
      return { success: false, action: `Failed to handle ${threat.type}`, error: e.message };
    }
  }

  async unblockIP(ip) {
    return BlockedIP.remove(ip);
  }
}

module.exports = CleanerService;
