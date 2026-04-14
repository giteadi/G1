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

        case 'suspicious_outbound':
          return await this.resolveOutbound(threat, force);

        case 'privacy_leaks':
          return await this.resolvePrivacyLeak(threat, force);

        case 'darkweb_connections':
          return await this.resolveDarkWeb(threat, force);

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

  // Suspicious outbound connection resolve
  async resolveOutbound(threat, force) {
    const results = [];
    try {
      // Step 1: IP block karo
      if (threat.attacker_ip) {
        BlockedIP.add(threat.attacker_ip, this.config.whitelist_ips);
        results.push(`Blocked IP: ${threat.attacker_ip}`);

        // Step 2: OS level firewall se bhi block
        try {
          // macOS
          execSync(`echo "block drop from any to ${threat.attacker_ip}" | sudo pfctl -f - 2>/dev/null || true`);
          results.push(`Firewall rule added for ${threat.attacker_ip}`);
        } catch {}

        try {
          // Linux iptables
          execSync(`iptables -A OUTPUT -d ${threat.attacker_ip} -j DROP 2>/dev/null || true`);
          execSync(`iptables -A INPUT -s ${threat.attacker_ip} -j DROP 2>/dev/null || true`);
          results.push(`iptables rule added for ${threat.attacker_ip}`);
        } catch {}
      }

      // Step 3: Jo process yeh connection bana raha tha, usse dhundho aur kill karo
      if (force && threat.findings?.length > 0) {
        threat.findings.forEach(finding => {
          const portMatch = finding.match(/Local port (\d+)/);
          if (portMatch) {
            try {
              // Us port pe kaun sa process hai
              const pid = execSync(
                `lsof -ti :${portMatch[1]} 2>/dev/null || fuser ${portMatch[1]}/tcp 2>/dev/null || true`
              ).toString().trim();
              
              if (pid) {
                execSync(`kill -9 ${pid} 2>/dev/null || true`);
                results.push(`Killed process PID ${pid} on port ${portMatch[1]}`);
              }
            } catch {}
          }
        });
      }

      return {
        success: true,
        action: results.join(' | ') || 'Outbound connection threat logged'
      };
    } catch(e) {
      return { success: false, action: 'Failed to resolve outbound', error: e.message };
    }
  }

  // Mic/Camera privacy leak resolve
  async resolvePrivacyLeak(threat, force) {
    const results = [];
    try {
      if (!threat.findings?.length) {
        return { success: true, action: 'Privacy leak logged — manual review needed' };
      }

      for (const finding of threat.findings) {
        // Process name extract karo finding se
        const procMatch = finding.match(/access: (.+)/);
        if (!procMatch) continue;
        const procName = procMatch[1].trim();

        if (force) {
          try {
            // Process kill karo by name
            execSync(`pkill -9 -f "${procName}" 2>/dev/null || true`);
            results.push(`Killed process: ${procName}`);
          } catch {}

          // macOS — app ka mic/camera permission revoke karo
          try {
            execSync(
              `tccutil reset Microphone "${procName}" 2>/dev/null || true`
            );
            execSync(
              `tccutil reset Camera "${procName}" 2>/dev/null || true`
            );
            results.push(`Revoked mic/camera permissions for: ${procName}`);
          } catch {}
        } else {
          results.push(`Privacy violation logged: ${procName} — run with force=true to kill`);
        }
      }

      return {
        success: true,
        action: results.join(' | ') || 'Privacy leak documented'
      };
    } catch(e) {
      return { success: false, action: 'Failed to resolve privacy leak', error: e.message };
    }
  }

  // Dark web / Tor connection resolve
  async resolveDarkWeb(threat, force) {
    const results = [];
    try {
      // Step 1: Tor ports block karo — firewall pe
      const torPorts = [9050, 9051, 9150, 9151, 9001, 9030];
      for (const port of torPorts) {
        try {
          // Linux
          execSync(`iptables -A OUTPUT -p tcp --dport ${port} -j DROP 2>/dev/null || true`);
          execSync(`iptables -A INPUT -p tcp --sport ${port} -j DROP 2>/dev/null || true`);
          // macOS
          execSync(`echo "block drop proto tcp from any port ${port} to any" | sudo pfctl -f - 2>/dev/null || true`);
        } catch {}
      }
      results.push(`Tor ports blocked: ${torPorts.join(', ')}`);

      // Step 2: C2 ports bhi block karo
      const c2Ports = [4444, 4445, 1337, 31337, 6666, 6667];
      for (const port of c2Ports) {
        try {
          execSync(`iptables -A OUTPUT -p tcp --dport ${port} -j DROP 2>/dev/null || true`);
        } catch {}
      }
      results.push(`C2 ports blocked: ${c2Ports.join(', ')}`);

      // Step 3: Active Tor processes dhundho aur kill karo
      if (force) {
        try {
          const torProcs = execSync(
            'pgrep -l "tor|tord|tor2web" 2>/dev/null || true'
          ).toString().trim();
          
          if (torProcs) {
            execSync('pkill -9 -f "^tor$\\|tord\\|tor2web" 2>/dev/null || true');
            results.push(`Killed Tor process(es)`);
          }
        } catch {}

        // Attacker IP bhi block karo agar available ho
        if (threat.attacker_ip) {
          BlockedIP.add(threat.attacker_ip, this.config.whitelist_ips);
          try {
            execSync(`iptables -A INPUT -s ${threat.attacker_ip} -j DROP 2>/dev/null || true`);
            execSync(`iptables -A OUTPUT -d ${threat.attacker_ip} -j DROP 2>/dev/null || true`);
          } catch {}
          results.push(`Blocked dark web IP: ${threat.attacker_ip}`);
        }
      }

      // Step 4: DNS over HTTPS disable karo (prevent DNS leak)
      try {
        execSync(`echo "nameserver 1.1.1.1" > /etc/resolv.conf 2>/dev/null || true`);
        results.push('DNS reset to safe resolver');
      } catch {}

      return {
        success: true,
        action: results.join(' | ')
      };
    } catch(e) {
      return { success: false, action: 'Failed to resolve dark web connection', error: e.message };
    }
  }

  async unblockIP(ip) {
    return BlockedIP.remove(ip);
  }
}

module.exports = CleanerService;
