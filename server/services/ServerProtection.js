'use strict';

const { execSync } = require('child_process');
const si = require('systeminformation');
const logger = require('../utils/logger');

class ServerProtection {
  constructor(config = {}) {
    this.config = config;
    this.protectionStatus = {
      firewall: false,
      fail2ban: false,
      ssh_hardened: false,
      auto_updates: false,
      intrusion_detection: false
    };
    this.blockedIPs = new Set();
    this.protectionHistory = [];
  }

  async initialize() {
    logger.info('Initializing server protection...');
    await this.checkProtectionStatus();
    return this.protectionStatus;
  }

  async checkProtectionStatus() {
    const checks = await Promise.allSettled([
      this.checkFirewallStatus(),
      this.checkFail2banStatus(),
      this.checkSSHConfig(),
      this.checkIntrusionDetection()
    ]);

    this.protectionStatus = {
      firewall: checks[0]?.status === 'fulfilled' ? checks[0].value : false,
      fail2ban: checks[1]?.status === 'fulfilled' ? checks[1].value : false,
      ssh_hardened: checks[2]?.status === 'fulfilled' ? checks[2].value.isHardened : false,
      intrusion_detection: checks[3]?.status === 'fulfilled' ? checks[3].value : false
    };

    return this.protectionStatus;
  }

  async checkFirewallStatus() {
    try {
      const ufwStatus = execSync('ufw status 2>/dev/null | grep -i "Status: active" || true').toString();
      if (ufwStatus.includes('active')) return true;

      const iptablesRules = execSync('iptables -L 2>/dev/null | grep -i "chain" | wc -l || echo 0').toString().trim();
      return parseInt(iptablesRules) > 0;
    } catch {
      return false;
    }
  }

  async checkFail2banStatus() {
    try {
      const status = execSync('systemctl is-active fail2ban 2>/dev/null || service fail2ban status 2>/dev/null || true').toString();
      return status.includes('active') || status.includes('running');
    } catch {
      return false;
    }
  }

  async checkSSHConfig() {
    const findings = [];
    let isHardened = true;

    try {
      const config = execSync('cat /etc/ssh/sshd_config 2>/dev/null || true').toString();

      const checks = [
        { pattern: /PasswordAuthentication\s+no/i, name: 'Password auth disabled', critical: true },
        { pattern: /PermitRootLogin\s+(no|prohibit-password)/i, name: 'Root login secured', critical: true },
        { pattern: /MaxAuthTries\s+\d+/i, name: 'Max auth tries set', critical: false },
        { pattern: /PubkeyAuthentication\s+yes/i, name: 'Key auth enabled', critical: false },
        { pattern: /PermitEmptyPasswords\s+no/i, name: 'Empty passwords disabled', critical: true },
        { pattern: /ClientAliveInterval\s+\d+/i, name: 'Connection timeout set', critical: false },
        { pattern: /AllowUsers/i, name: 'User whitelist configured', critical: false }
      ];

      for (const check of checks) {
        if (!check.pattern.test(config)) {
          findings.push(`SSH: ${check.name} - NOT CONFIGURED`);
          if (check.critical) isHardened = false;
        }
      }

      if (/PasswordAuthentication\s+yes/i.test(config)) {
        findings.push('SSH: Password authentication enabled - SECURITY RISK');
        isHardened = false;
      }

      if (/PermitRootLogin\s+yes/i.test(config)) {
        findings.push('SSH: Root login enabled - CRITICAL RISK');
        isHardened = false;
      }
    } catch (e) {
      logger.error(`SSH config check error: ${e.message}`);
      isHardened = false;
    }

    return { isHardened, findings };
  }

  async checkIntrusionDetection() {
    try {
      const aide = execSync('which aide 2>/dev/null || true').toString().trim();
      const rkhunter = execSync('which rkhunter 2>/dev/null || true').toString().trim();
      const chkrootkit = execSync('which chkrootkit 2>/dev/null || true').toString().trim();

      return !!(aide || rkhunter || chkrootkit);
    } catch {
      return false;
    }
  }

  async enableFirewall() {
    const results = [];
    try {
      try {
        execSync('ufw --force enable 2>/dev/null || true');
        results.push({ action: 'ufw_enable', status: 'success' });
      } catch {}

      const defaultRules = [
        'ufw default deny incoming',
        'ufw default allow outgoing',
        'ufw allow ssh',
        'ufw allow 22/tcp',
        'ufw allow 80/tcp',
        'ufw allow 443/tcp'
      ];

      for (const rule of defaultRules) {
        try {
          execSync(`${rule} 2>/dev/null || true`);
          results.push({ action: rule, status: 'success' });
        } catch {}
      }

      this.protectionStatus.firewall = true;
      this.logAction('firewall_enabled', { rules: results.length });

      return { success: true, results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async enableFail2ban() {
    const results = [];
    try {
      const configContent = `
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = auto

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
`;

      try {
        execSync(`echo '${configContent}' > /etc/fail2ban/jail.local 2>/dev/null || true`);
        results.push({ action: 'config_written', status: 'success' });
      } catch {}

      try {
        execSync('systemctl start fail2ban 2>/dev/null || service fail2ban start 2>/dev/null || true');
        results.push({ action: 'service_start', status: 'success' });
      } catch {}

      try {
        execSync('systemctl enable fail2ban 2>/dev/null || true');
        results.push({ action: 'service_enable', status: 'success' });
      } catch {}

      this.protectionStatus.fail2ban = true;
      this.logAction('fail2ban_enabled', { results });

      return { success: true, results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async hardenSSH() {
    const results = [];
    try {
      const hardeningConfig = `
# G1 Guardian SSH Hardening
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
X11Forwarding no
AllowTcpForwarding no
PermitTunnel no
`;

      try {
        execSync(`echo '${hardeningConfig}' >> /etc/ssh/sshd_config.d/g1-hardening.conf 2>/dev/null || echo '${hardeningConfig}' >> /etc/ssh/sshd_config 2>/dev/null || true`);
        results.push({ action: 'config_written', status: 'success' });
      } catch {}

      try {
        execSync('sshd -t 2>/dev/null || true');
        results.push({ action: 'config_test', status: 'success' });
      } catch {}

      try {
        execSync('systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null || true');
        results.push({ action: 'service_restart', status: 'success' });
      } catch {}

      this.protectionStatus.ssh_hardened = true;
      this.logAction('ssh_hardened', { results });

      return { success: true, results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async blockIP(ip, reason = 'manual') {
    try {
      if (this.blockedIPs.has(ip)) {
        return { success: true, alreadyBlocked: true };
      }

      const results = [];

      try {
        execSync(`ufw deny from ${ip} 2>/dev/null || true`);
        results.push('ufw');
      } catch {}

      try {
        execSync(`iptables -A INPUT -s ${ip} -j DROP 2>/dev/null || true`);
        execSync(`iptables -A OUTPUT -d ${ip} -j DROP 2>/dev/null || true`);
        results.push('iptables');
      } catch {}

      try {
        execSync(`echo "block drop from any to ${ip}" | sudo pfctl -f - 2>/dev/null || true`);
        results.push('pfctl');
      } catch {}

      this.blockedIPs.add(ip);
      this.logAction('ip_blocked', { ip, reason, methods: results });

      return { success: true, ip, methods: results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async unblockIP(ip) {
    try {
      const results = [];

      try {
        execSync(`ufw delete deny from ${ip} 2>/dev/null || true`);
        results.push('ufw');
      } catch {}

      try {
        execSync(`iptables -D INPUT -s ${ip} -j DROP 2>/dev/null || true`);
        execSync(`iptables -D OUTPUT -d ${ip} -j DROP 2>/dev/null || true`);
        results.push('iptables');
      } catch {}

      this.blockedIPs.delete(ip);
      this.logAction('ip_unblocked', { ip });

      return { success: true, ip, methods: results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async isolateNetwork(pid) {
    try {
      const results = [];

      try {
        execSync(`kill -STOP ${pid} 2>/dev/null || true`);
        results.push('process_paused');
      } catch {}

      try {
        const connections = await si.networkConnections();
        const procConns = connections.filter(c => c.pid === pid);

        for (const conn of procConns) {
          if (conn.peerAddress) {
            execSync(`iptables -A OUTPUT -d ${conn.peerAddress} -j DROP 2>/dev/null || true`);
          }
        }

        results.push('network_isolated');
      } catch {}

      this.logAction('network_isolated', { pid, results });

      return { success: true, pid, actions: results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async scanForVulnerabilities() {
    const vulnerabilities = [];

    try {
      // Quick port check with timeout
      const openPorts = await Promise.race([
        si.networkConnections(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      const dangerousPorts = [23, 21, 110, 143, 993, 995, 3389, 5900, 5800];
      const exposedDangerous = openPorts.filter(c =>
        dangerousPorts.includes(c.localPort) && c.state === 'LISTEN'
      );

      if (exposedDangerous.length > 0) {
        vulnerabilities.push({
          type: 'dangerous_port_exposed',
          severity: 'high',
          ports: exposedDangerous.map(p => p.localPort),
          message: 'Dangerous service ports exposed to network'
        });
      }

      // Quick rootkit check - timeout after 5 seconds (don't run full scan)
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        const { stdout: rootkits } = await execPromise(
          'rkhunter --version 2>/dev/null || chkrootkit -V 2>/dev/null || echo "not_installed"',
          { timeout: 5000 }
        );

        if (rootkits.includes('not_installed')) {
          vulnerabilities.push({
            type: 'rootkit_scanner_missing',
            severity: 'medium',
            message: 'Rootkit scanner not installed - consider installing rkhunter or chkrootkit'
          });
        }
      } catch {}

      // Quick SUID check - limited paths only
      try {
        const { stdout: setuidFiles } = await require('util').promisify(require('child_process').exec)(
          'find /usr/bin /bin /usr/sbin /sbin -perm -4000 -type f 2>/dev/null | head -10 || true',
          { timeout: 10000 }
        );

        const knownGood = ['sudo', 'su', 'passwd', 'mount', 'umount', 'ping', 'newgrp'];
        const suspicious = setuidFiles.split('\n').filter(f => {
          if (!f) return false;
          return !knownGood.some(good => f.includes(good));
        });

        if (suspicious.length > 0) {
          vulnerabilities.push({
            type: 'suspicious_setuid',
            severity: 'high',
            files: suspicious.slice(0, 5),
            message: `${suspicious.length} unexpected SUID binaries found`
          });
        }
      } catch {}

    } catch (e) {
      logger.error(`Vulnerability scan error: ${e.message}`);
    }

    return vulnerabilities;
  }

  async applyHoneypot() {
    try {
      const results = [];

      try {
        execSync('iptables -A INPUT -p tcp --dport 2222 -j LOG --log-prefix "HONEYPOT_SSH: " 2>/dev/null || true');
        execSync('iptables -A INPUT -p tcp --dport 2222 -j DROP 2>/dev/null || true');
        results.push('ssh_honeypot_port_2222');
      } catch {}

      try {
        execSync('iptables -A INPUT -p tcp --dport 3389 -j LOG --log-prefix "HONEYPOT_RDP: " 2>/dev/null || true');
        execSync('iptables -A INPUT -p tcp --dport 3389 -j DROP 2>/dev/null || true');
        results.push('rdp_honeypot_port_3389');
      } catch {}

      this.logAction('honeypot_deployed', { results });

      return { success: true, results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getActiveProtectionStatus() {
    const [firewallRules, blockedCount, recentBlocks] = await Promise.all([
      this.getFirewallRules(),
      this.blockedIPs.size,
      this.getRecentBlocks()
    ]);

    return {
      status: this.protectionStatus,
      firewall_rules: firewallRules,
      blocked_ips_count: blockedCount,
      recent_blocks: recentBlocks,
      protection_level: this.calculateProtectionLevel()
    };
  }

  async getFirewallRules() {
    try {
      const ufwRules = execSync('ufw status numbered 2>/dev/null || true').toString();
      const iptablesRules = execSync('iptables -L -n 2>/dev/null | head -20 || true').toString();

      return {
        ufw: ufwRules.includes('Status: active') ? ufwRules : 'inactive',
        iptables: iptablesRules.includes('Chain') ? iptablesRules : 'none'
      };
    } catch {
      return { ufw: 'error', iptables: 'error' };
    }
  }

  getRecentBlocks(limit = 10) {
    return this.protectionHistory
      .filter(h => h.action === 'ip_blocked')
      .slice(-limit)
      .reverse();
  }

  calculateProtectionLevel() {
    let score = 0;
    if (this.protectionStatus.firewall) score += 25;
    if (this.protectionStatus.fail2ban) score += 25;
    if (this.protectionStatus.ssh_hardened) score += 25;
    if (this.protectionStatus.intrusion_detection) score += 25;

    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'none';
  }

  logAction(action, details) {
    this.protectionHistory.push({
      action,
      details,
      timestamp: new Date().toISOString()
    });

    if (this.protectionHistory.length > 1000) {
      this.protectionHistory = this.protectionHistory.slice(-1000);
    }
  }

  async enableAutoRemediation() {
    this.config.auto_remediate = true;
    return { success: true, auto_remediate: true };
  }

  async disableAutoRemediation() {
    this.config.auto_remediate = false;
    return { success: true, auto_remediate: false };
  }
}

module.exports = ServerProtection;
