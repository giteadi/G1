'use strict';

const { execSync } = require('child_process');
const Threat = require('../models/Threat');
const BlockedIP = require('../models/BlockedIP');
const CryptoDetector = require('./CryptoDetector');
const ServerProtection = require('./ServerProtection');
const logger = require('../utils/logger');

class CleanerService {
  constructor(config) {
    this.config = config;
    this.cryptoDetector = new CryptoDetector(config);
    this.serverProtection = new ServerProtection(config);
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
        case 'crypto_mining_advanced':
          return await this.resolveCryptoMiner(threat, force);

        case 'brute_force':
          return await this.resolveBruteForce(threat, force);

        case 'suspicious_outbound':
          return await this.resolveOutbound(threat, force);

        case 'privacy_leaks':
          return await this.resolvePrivacyLeak(threat, force);

        case 'darkweb_connections':
          return await this.resolveDarkWeb(threat, force);

        case 'suspicious_connection':
          return await this.resolveSuspiciousConnection(threat, force);

        case 'high_cpu_process':
          return await this.resolveHighCpuProcess(threat, force);

        case 'vulnerability':
          return await this.resolveVulnerability(threat);

        case 'system_protection_low':
          return await this.resolveLowProtection(threat);

        default:
          return { success: true, action: `Threat ${threat.type} marked as reviewed` };
      }
    } catch (e) {
      logger.error(`Failed to handle ${threat.type}: ${e.message}`);
      return { success: false, action: `Failed to handle ${threat.type}`, error: e.message };
    }
  }

  async resolveCryptoMiner(threat, force) {
    const results = [];

    if (threat.pid) {
      if (threat.severity === 'critical' || force) {
        const killResult = await this.cryptoDetector.terminateProcess(threat.pid);
        results.push(killResult.action);
      } else {
        const isolateResult = await this.cryptoDetector.isolateProcess(threat.pid);
        results.push(isolateResult.action);
      }

      if (threat.indicators?.includes('cron_backdoor')) {
        try {
          execSync('crontab -r 2>/dev/null || true');
          results.push('user_crontab_cleared');
        } catch {}
      }
    }

    if (threat.findings?.length) {
      const filesToRemove = threat.findings
        .filter(f => f.type === 'suspicious_executable')
        .map(f => f.path);

      if (filesToRemove.length) {
        const removeResult = await this.cryptoDetector.removeFiles(filesToRemove);
        results.push(`removed_${removeResult.filter(r => r.removed).length}_files`);
      }
    }

    logger.warn(`Resolved crypto miner: PID ${threat.pid} - ${results.join(', ')}`);
    return { success: true, action: results.join(' | ') || 'Crypto miner threat logged' };
  }

  async resolveBruteForce(threat, force) {
    if (threat.attacker_ip) {
      const result = await this.serverProtection.blockIP(threat.attacker_ip, 'brute_force');
      await this.serverProtection.enableFail2ban();
      logger.warn(`Blocked attacker IP: ${threat.attacker_ip}`);
      return { success: result.success, action: `Blocked attacker IP: ${threat.attacker_ip}` };
    }
    return { success: true, action: 'Brute force threat logged' };
  }

  async resolveSuspiciousConnection(threat, force) {
    if (threat.attacker_ip) {
      await this.serverProtection.blockIP(threat.attacker_ip, 'suspicious_connection');

      if (force && threat.pid) {
        await this.serverProtection.isolateNetwork(threat.pid);
      }

      return { success: true, action: `Blocked suspicious IP: ${threat.attacker_ip}` };
    }
    return { success: true, action: 'Connection threat logged' };
  }

  async resolveHighCpuProcess(threat, force) {
    if (threat.pid && force) {
      const result = await this.cryptoDetector.terminateProcess(threat.pid);
      return { success: result.success, action: `Killed high CPU process PID ${threat.pid}` };
    }
    return { success: true, action: `High CPU process logged (PID: ${threat.pid})` };
  }

  async resolveVulnerability(threat) {
    const results = [];

    if (threat.details?.type === 'dangerous_port_exposed') {
      for (const port of threat.details.ports || []) {
        try {
          execSync(`iptables -A INPUT -p tcp --dport ${port} -j DROP 2>/dev/null || true`);
          results.push(`blocked_port_${port}`);
        } catch {}
      }
    }

    if (threat.details?.type === 'world_writable_system_files') {
      results.push('manual_review_required: World-writable system files detected');
    }

    return { success: true, action: results.join(' | ') || 'Vulnerability logged for review' };
  }

  async resolveLowProtection(threat) {
    const results = [];

    try {
      const fwResult = await this.serverProtection.enableFirewall();
      if (fwResult.success) results.push('firewall_enabled');
    } catch {}

    try {
      const f2bResult = await this.serverProtection.enableFail2ban();
      if (f2bResult.success) results.push('fail2ban_enabled');
    } catch {}

    return { success: results.length > 0, action: results.join(' | ') || 'Auto-protection applied' };
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
