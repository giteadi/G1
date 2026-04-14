'use strict';

const { execSync } = require('child_process');
const si = require('systeminformation');
const logger = require('../utils/logger');

/**
 * Production-Level Security Modules
 * Scan → Identify → Resolve
 * Level 1: Normal | Level 2: Warning | Level 3: Attack
 */
class SecurityModules {
  constructor(config = {}) {
    this.config = config;
    this.whitelist = new Set(config.whitelist_ips || []);
    this.detectionCache = new Map();
  }

  // ==================== CRYPTO MINER MODULE ====================
  async cryptoMinerScan() {
    const findings = [];
    try {
      // SCAN: ps aux --sort=-%cpu | head -10
      const procs = await si.processes();
      const topCpu = procs.list
        .filter(p => !this.isWhitelistedProcess(p.name))
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10);

      // SCAN: ps aux | grep -E "xmrig|minerd"
      const minerSignatures = ['xmrig', 'minerd', 'cpuminer', 'cgminer', 'ethminer', 'minergate'];

      for (const proc of topCpu) {
        const cmd = (proc.name + ' ' + (proc.command || '')).toLowerCase();

        // IDENTIFY: CPU 80-100% + unknown process + background running
        const hasSignature = minerSignatures.some(sig => cmd.includes(sig));
        const isHighCpu = proc.cpu >= 80;
        const isUnknown = !this.isLegitimateProcess(proc.name);
        const isBackground = proc.pid > 1000;

        let level = 1; // Normal
        if (hasSignature || (isHighCpu && isUnknown)) level = 3; // Attack
        else if (isHighCpu) level = 2; // Warning

        if (level >= 2) {
          findings.push({
            type: 'crypto_miner',
            level,
            pid: proc.pid,
            process: proc.name,
            cpu: proc.cpu,
            cmd: proc.command,
            indicators: {
              signature_match: hasSignature,
              high_cpu: isHighCpu,
              unknown_process: isUnknown,
              background: isBackground
            },
            resolve_commands: [
              `pkill ${proc.name}`,
              `kill -9 ${proc.pid}`,
              `rm -f /usr/local/bin/${proc.name}`
            ]
          });
        }
      }
    } catch (e) {
      logger.error(`Crypto scan error: ${e.message}`);
    }

    return { module: 'crypto_miner', findings };
  }

  async cryptoMinerResolve(pid, processName) {
    const results = [];
    try {
      // RESOLVE: pkill xmrig
      try {
        execSync(`pkill ${processName} 2>/dev/null || true`);
        results.push({ action: 'pkill', target: processName, success: true });
      } catch {}

      // RESOLVE: kill -9 PID
      try {
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        results.push({ action: 'kill', target: pid, success: true });
      } catch {}

      // RESOLVE: rm -f /usr/local/bin/xmrig
      try {
        execSync(`rm -f /usr/local/bin/${processName} /tmp/${processName} /var/tmp/${processName} 2>/dev/null || true`);
        results.push({ action: 'remove_files', target: processName, success: true });
      } catch {}

      return { success: true, level: 3, action: 'terminated', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== BRUTE FORCE MODULE ====================
  async bruteForceScan() {
    const findings = [];
    try {
      // SCAN: grep "Failed password" /var/log/auth.log
      const authLog = execSync('tail -500 /var/log/auth.log 2>/dev/null || grep "Failed password" /var/log/secure 2>/dev/null || echo ""').toString();

      const failedAttempts = authLog.match(/Failed password for .* from (\d+\.\d+\.\d+\.\d+)/g) || [];

      // Group by IP
      const ipAttempts = {};
      failedAttempts.forEach(attempt => {
        const ip = attempt.match(/from (\d+\.\d+\.\d+\.\d+)/)?.[1];
        if (ip) {
          ipAttempts[ip] = (ipAttempts[ip] || 0) + 1;
        }
      });

      // IDENTIFY: same IP multiple attempts + rapid login tries
      for (const [ip, count] of Object.entries(ipAttempts)) {
        let level = 1;
        if (count >= 10) level = 3; // Attack
        else if (count >= 5) level = 2; // Warning

        if (level >= 2) {
          findings.push({
            type: 'brute_force',
            level,
            attacker_ip: ip,
            attempts: count,
            indicators: {
              multiple_attempts: count >= 5,
              rapid_fire: count >= 10
            },
            resolve_commands: [
              `ufw deny from ${ip}`,
              `iptables -A INPUT -s ${ip} -j DROP`,
              'sudo systemctl restart fail2ban'
            ]
          });
        }
      }
    } catch (e) {
      logger.error(`Brute force scan error: ${e.message}`);
    }

    return { module: 'brute_force', findings };
  }

  async bruteForceResolve(ip) {
    const results = [];
    try {
      // RESOLVE: ufw deny <IP>
      try {
        execSync(`ufw deny from ${ip} 2>/dev/null || true`);
        results.push({ action: 'ufw_block', target: ip, success: true });
      } catch {}

      // RESOLVE: iptables
      try {
        execSync(`iptables -A INPUT -s ${ip} -j DROP 2>/dev/null || true`);
        results.push({ action: 'iptables_block', target: ip, success: true });
      } catch {}

      // RESOLVE: sudo systemctl restart fail2ban
      try {
        execSync('systemctl restart fail2ban 2>/dev/null || service fail2ban restart 2>/dev/null || true');
        results.push({ action: 'fail2ban_restart', success: true });
      } catch {}

      return { success: true, level: 3, action: 'blocked', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== DDOS GUARD MODULE ====================
  async ddosScan() {
    const findings = [];
    try {
      // SCAN: netstat -an | grep :80 | wc -l
      const connections = await si.networkConnections();
      const port80Conns = connections.filter(c => c.localPort === 80 || c.localPort === 443);

      // Group by remote IP
      const ipConnections = {};
      port80Conns.forEach(c => {
        if (c.peerAddress) {
          ipConnections[c.peerAddress] = (ipConnections[c.peerAddress] || 0) + 1;
        }
      });

      // IDENTIFY: too many connections + same IP flood
      for (const [ip, count] of Object.entries(ipConnections)) {
        if (this.whitelist.has(ip)) continue;

        let level = 1;
        if (count >= 100) level = 3; // Attack
        else if (count >= 50) level = 2; // Warning

        if (level >= 2) {
          findings.push({
            type: 'ddos',
            level,
            attacker_ip: ip,
            connections: count,
            indicators: {
              too_many_connections: count >= 50,
              ip_flood: count >= 100
            },
            resolve_commands: [
              'ufw limit 80/tcp',
              'ufw limit 443/tcp',
              `iptables -A INPUT -s ${ip} -j DROP`,
              'iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 20 -j DROP'
            ]
          });
        }
      }

      // Overall connection flood check
      if (connections.length > 1000) {
        findings.push({
          type: 'ddos_flood',
          level: 3,
          total_connections: connections.length,
          indicators: { connection_flood: true },
          resolve_commands: [
            'iptables -A INPUT -p tcp --syn -m limit --limit 1/second --limit-burst 3 -j ACCEPT',
            'iptables -A INPUT -p tcp --syn -j DROP'
          ]
        });
      }
    } catch (e) {
      logger.error(`DDoS scan error: ${e.message}`);
    }

    return { module: 'ddos_guard', findings };
  }

  async ddosResolve(ip) {
    const results = [];
    try {
      // RESOLVE: ufw limit 80/tcp
      try {
        execSync('ufw limit 80/tcp 2>/dev/null || true');
        execSync('ufw limit 443/tcp 2>/dev/null || true');
        results.push({ action: 'rate_limit', ports: [80, 443], success: true });
      } catch {}

      // RESOLVE: iptables connection limiting
      if (ip) {
        try {
          execSync(`iptables -A INPUT -s ${ip} -j DROP 2>/dev/null || true`);
          results.push({ action: 'block_ip', target: ip, success: true });
        } catch {}
      }

      try {
        execSync('iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 20 -j DROP 2>/dev/null || true');
        results.push({ action: 'connlimit', limit: 20, success: true });
      } catch {}

      return { success: true, level: 3, action: 'mitigated', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== ROOTKIT SCAN MODULE ====================
  async rootkitScan() {
    const findings = [];
    try {
      // SCAN: sudo chkrootkit
      let chkrootkitOutput = '';
      try {
        chkrootkitOutput = execSync('chkrootkit 2>/dev/null | grep -i "infected\\|warning\\|suspicious" || true').toString();
      } catch {}

      // SCAN: sudo rkhunter --check
      let rkhunterOutput = '';
      try {
        rkhunterOutput = execSync('rkhunter --check --sk --rwo 2>/dev/null | grep -i "warning\\|infected" || true').toString();
      } catch {}

      // IDENTIFY: hidden binaries + system file tampering
      const hasInfection = chkrootkitOutput.includes('INFECTED') || rkhunterOutput.includes('Warning');
      const hasRootkit = chkrootkitOutput.toLowerCase().includes('rootkit') || rkhunterOutput.toLowerCase().includes('rootkit');

      let level = 1;
      if (hasInfection || hasRootkit) level = 3; // Attack - severe

      if (level >= 2) {
        findings.push({
          type: 'rootkit',
          level,
          indicators: {
            hidden_binaries: chkrootkitOutput.includes('INFECTED'),
            system_tampering: rkhunterOutput.includes('Warning'),
            rootkit_detected: hasRootkit
          },
          details: { chkrootkit: chkrootkitOutput, rkhunter: rkhunterOutput },
          resolve_commands: [
            'apt install chkrootkit rkhunter -y',
            'rkhunter --update',
            'rkhunter --check --sk',
            '⚠️ SEVERE CASE: backup → reinstall OS'
          ],
          severity_note: level === 3 ? 'CRITICAL: Consider OS reinstallation' : 'Review required'
        });
      }
    } catch (e) {
      logger.error(`Rootkit scan error: ${e.message}`);
    }

    return { module: 'rootkit_scan', findings };
  }

  // ==================== SUSPICIOUS CRONS MODULE ====================
  async cronScan() {
    const findings = [];
    try {
      // SCAN: crontab -l
      const userCrons = execSync('crontab -l 2>/dev/null || echo ""').toString();

      // SCAN: ls /etc/cron.*
      const systemCrons = [
        '/etc/crontab',
        '/etc/cron.d/*',
        '/etc/cron.daily/*',
        '/etc/cron.hourly/*'
      ];

      const suspiciousPatterns = [
        /wget.*\|.*bash/i,
        /curl.*\|.*bash/i,
        /base64.*-d/i,
        /\/dev\/tcp\//i,
        /bash.*-c.*base64/i,
        /python.*-c.*socket/i,
        /perl.*-e.*socket/i
      ];

      const allCrons = [userCrons];
      for (const cronPath of systemCrons) {
        try {
          const content = execSync(`cat ${cronPath} 2>/dev/null || true`).toString();
          allCrons.push(content);
        } catch {}
      }

      // IDENTIFY: unknown scripts + auto running malware
      for (const cronContent of allCrons) {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(cronContent)) {
            findings.push({
              type: 'suspicious_cron',
              level: 3, // Attack
              pattern: pattern.toString(),
              indicators: {
                unknown_script: true,
                auto_malware: true,
                backdoor_pattern: true
              },
              resolve_commands: [
                'crontab -e  # Remove suspicious entries',
                'crontab -r  # Clear user crontab if compromised',
                'rm -f /path/to/suspicious.sh'
              ]
            });
          }
        }
      }
    } catch (e) {
      logger.error(`Cron scan error: ${e.message}`);
    }

    return { module: 'suspicious_crons', findings };
  }

  async cronResolve(cronPath) {
    const results = [];
    try {
      // RESOLVE: crontab -r (clear user crontab)
      try {
        execSync('crontab -r 2>/dev/null || true');
        results.push({ action: 'clear_user_crontab', success: true });
      } catch {}

      // RESOLVE: Remove suspicious files
      if (cronPath) {
        try {
          execSync(`rm -f ${cronPath} 2>/dev/null || true`);
          results.push({ action: 'remove_file', target: cronPath, success: true });
        } catch {}
      }

      return { success: true, level: 3, action: 'cleaned', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== OPEN PORTS MODULE ====================
  async portsScan() {
    const findings = [];
    try {
      // SCAN: ss -tulnp
      const connections = await si.networkConnections();
      const listeningPorts = connections.filter(c => c.state === 'LISTEN');

      const dangerousPorts = [23, 21, 110, 143, 3389, 5900, 5800, 4444, 5555, 6666];

      for (const conn of listeningPorts) {
        const isDangerous = dangerousPorts.includes(conn.localPort);
        const isUnknown = !this.isCommonServicePort(conn.localPort);

        let level = 1;
        if (isDangerous) level = 3; // Attack
        else if (isUnknown) level = 2; // Warning

        if (level >= 2) {
          findings.push({
            type: 'open_port',
            level,
            port: conn.localPort,
            process: conn.process,
            indicators: {
              dangerous_port: isDangerous,
              unexpected_service: isUnknown
            },
            resolve_commands: [
              `ufw deny ${conn.localPort}`,
              `kill -9 ${conn.pid || 'PID'}`,
              `systemctl stop ${conn.process || 'service'}`
            ]
          });
        }
      }
    } catch (e) {
      logger.error(`Port scan error: ${e.message}`);
    }

    return { module: 'open_ports', findings };
  }

  async portResolve(port, pid) {
    const results = [];
    try {
      // RESOLVE: ufw deny PORT
      try {
        execSync(`ufw deny ${port} 2>/dev/null || true`);
        results.push({ action: 'ufw_deny', port, success: true });
      } catch {}

      // RESOLVE: kill -9 PID
      if (pid) {
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`);
          results.push({ action: 'kill_process', pid, success: true });
        } catch {}
      }

      return { success: true, level: 3, action: 'closed', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== SSH CONFIG MODULE ====================
  async sshScan() {
    const findings = [];
    try {
      // SCAN: cat /etc/ssh/sshd_config
      const config = execSync('cat /etc/ssh/sshd_config 2>/dev/null || echo ""').toString();

      const issues = [];
      if (/PermitRootLogin\s+yes/i.test(config)) issues.push('root_login_enabled');
      if (/PasswordAuthentication\s+yes/i.test(config)) issues.push('password_auth_enabled');
      if (!/MaxAuthTries\s+\d+/i.test(config)) issues.push('no_auth_limit');
      if (!/PubkeyAuthentication\s+yes/i.test(config)) issues.push('key_auth_not_required');

      let level = 1;
      if (issues.includes('root_login_enabled')) level = 3; // Attack risk
      else if (issues.length >= 2) level = 2; // Warning

      if (issues.length > 0) {
        findings.push({
          type: 'ssh_weakness',
          level,
          issues,
          indicators: {
            root_login: issues.includes('root_login_enabled'),
            weak_auth: issues.includes('password_auth_enabled')
          },
          resolve_commands: [
            'echo "PermitRootLogin no" >> /etc/ssh/sshd_config',
            'echo "PasswordAuthentication no" >> /etc/ssh/sshd_config',
            'echo "MaxAuthTries 3" >> /etc/ssh/sshd_config',
            'sudo systemctl restart ssh'
          ]
        });
      }
    } catch (e) {
      logger.error(`SSH scan error: ${e.message}`);
    }

    return { module: 'ssh_config', findings };
  }

  async sshResolve() {
    const results = [];
    try {
      // RESOLVE: Hardcoded SSH hardening
      const hardening = `
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
PubkeyAuthentication yes
PermitEmptyPasswords no
ClientAliveInterval 300
X11Forwarding no
`;

      try {
        execSync(`echo '${hardening}' >> /etc/ssh/sshd_config.d/g1-hardening.conf 2>/dev/null || echo '${hardening}' >> /etc/ssh/sshd_config 2>/dev/null || true`);
        results.push({ action: 'write_config', success: true });
      } catch {}

      // RESOLVE: sudo systemctl restart ssh
      try {
        execSync('systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null || true');
        results.push({ action: 'restart_ssh', success: true });
      } catch {}

      return { success: true, level: 3, action: 'hardened', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== PRIVACY LEAKS MODULE ====================
  async privacyScan() {
    const findings = [];
    try {
      // SCAN: lsof for camera/mic
      const lsofOutput = execSync('lsof 2>/dev/null | grep -i "camera\|mic\|audio\|video" || true').toString();

      const suspiciousAccess = lsofOutput.split('\n').filter(line => {
        const proc = line.split(/\s+/)[0]?.toLowerCase() || '';
        return proc && !this.isLegitimateProcess(proc) && line.match(/camera|mic|audio|video/i);
      });

      for (const access of suspiciousAccess.slice(0, 5)) {
        const proc = access.split(/\s+/)[0];
        const pid = access.split(/\s+/)[1];

        findings.push({
          type: 'privacy_leak',
          level: 2, // Warning
          process: proc,
          pid,
          indicators: {
            camera_access: access.includes('camera'),
            mic_access: access.includes('mic') || access.includes('audio')
          },
          resolve_commands: [
            `kill -9 ${pid}`,
            `tccutil reset Camera "${proc}" 2>/dev/null || true`,
            `tccutil reset Microphone "${proc}" 2>/dev/null || true`
          ]
        });
      }
    } catch (e) {
      logger.error(`Privacy scan error: ${e.message}`);
    }

    return { module: 'privacy_leaks', findings };
  }

  // ==================== DARK WEB / C2 MODULE ====================
  async darkwebScan() {
    const findings = [];
    try {
      // SCAN: netstat -tunap
      const connections = await si.networkConnections();
      const established = connections.filter(c => c.state === 'ESTABLISHED');

      const torPorts = [9050, 9051, 9150, 9151, 9001, 9030];
      const c2Ports = [4444, 4445, 1337, 31337, 6666, 6667];

      for (const conn of established) {
        const isTor = torPorts.includes(conn.peerPort);
        const isC2 = c2Ports.includes(conn.peerPort);
        const isUnknownForeign = !this.isPrivateIP(conn.peerAddress) && !this.whitelist.has(conn.peerAddress);

        if (isTor || isC2 || (isUnknownForeign && conn.peerPort > 10000)) {
          let level = 2;
          if (isC2 || isTor) level = 3; // Attack

          findings.push({
            type: 'darkweb_c2',
            level,
            remote_ip: conn.peerAddress,
            remote_port: conn.peerPort,
            local_port: conn.localPort,
            indicators: {
              tor_traffic: isTor,
              c2_connection: isC2,
              unknown_foreign: isUnknownForeign
            },
            resolve_commands: [
              `iptables -A OUTPUT -d ${conn.peerAddress} -j DROP`,
              `ufw deny out to ${conn.peerAddress}`,
              `kill -9 ${conn.pid || 'PID'}`
            ]
          });
        }
      }
    } catch (e) {
      logger.error(`Darkweb scan error: ${e.message}`);
    }

    return { module: 'darkweb_c2', findings };
  }

  async darkwebResolve(ip, pid) {
    const results = [];
    try {
      // RESOLVE: iptables -A OUTPUT -d IP -j DROP
      if (ip) {
        try {
          execSync(`iptables -A OUTPUT -d ${ip} -j DROP 2>/dev/null || true`);
          execSync(`iptables -A INPUT -s ${ip} -j DROP 2>/dev/null || true`);
          results.push({ action: 'iptables_block', target: ip, success: true });
        } catch {}

        // RESOLVE: ufw deny out to IP
        try {
          execSync(`ufw deny out to ${ip} 2>/dev/null || true`);
          results.push({ action: 'ufw_block', target: ip, success: true });
        } catch {}
      }

      // RESOLVE: kill -9 PID
      if (pid) {
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`);
          results.push({ action: 'kill_process', pid, success: true });
        } catch {}
      }

      return { success: true, level: 3, action: 'blocked', results };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ==================== SYSTEM MONITOR MODULE ====================
  async systemMonitor() {
    try {
      // SCAN: top / htop equivalent
      const [cpu, mem, load] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.load()
      ]);

      const cpuPercent = cpu.currentLoad || 0;
      const memPercent = ((mem.used / mem.total) * 100) || 0;
      const loadAvg = load.avgLoad || 0;

      let level = 1;
      if (cpuPercent > 90 || memPercent > 90) level = 3;
      else if (cpuPercent > 70 || memPercent > 70) level = 2;

      return {
        module: 'system_monitor',
        level,
        metrics: {
          cpu: cpuPercent.toFixed(1),
          memory: memPercent.toFixed(1),
          load: loadAvg.toFixed(2)
        },
        status: level === 1 ? 'normal' : level === 2 ? 'warning' : 'critical'
      };
    } catch (e) {
      return { module: 'system_monitor', level: 1, error: e.message };
    }
  }

  // ==================== MASTER LOGIC ====================
  async masterScan() {
    const allResults = await Promise.all([
      this.cryptoMinerScan(),
      this.bruteForceScan(),
      this.ddosScan(),
      this.rootkitScan(),
      this.cronScan(),
      this.portsScan(),
      this.sshScan(),
      this.privacyScan(),
      this.darkwebScan(),
      this.systemMonitor()
    ]);

    const threats = [];
    const warnings = [];
    const normal = [];

    for (const result of allResults) {
      if (result.findings) {
        for (const finding of result.findings) {
          if (finding.level === 3) threats.push(finding);
          else if (finding.level === 2) warnings.push(finding);
          else normal.push(finding);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        threats: threats.length,
        warnings: warnings.length,
        normal: normal.length,
        total_risk_score: threats.length * 10 + warnings.length * 5
      },
      threats,
      warnings,
      details: allResults
    };
  }

  async resolveThreat(finding) {
    const { type, level } = finding;

    if (level === 1) {
      return { action: 'ignored', reason: 'low_risk_whitelist' };
    }

    switch (type) {
      case 'crypto_miner':
        return await this.cryptoMinerResolve(finding.pid, finding.process);
      case 'brute_force':
        return await this.bruteForceResolve(finding.attacker_ip);
      case 'ddos':
      case 'ddos_flood':
        return await this.ddosResolve(finding.attacker_ip);
      case 'suspicious_cron':
        return await this.cronResolve();
      case 'open_port':
        return await this.portResolve(finding.port, finding.pid);
      case 'ssh_weakness':
        return await this.sshResolve();
      case 'darkweb_c2':
        return await this.darkwebResolve(finding.remote_ip, finding.pid);
      default:
        return { action: 'logged', finding: type };
    }
  }

  // ==================== HELPERS ====================
  isWhitelistedProcess(name) {
    const whitelist = ['system', 'kernel', 'init'];
    return whitelist.some(w => name?.toLowerCase().includes(w));
  }

  isLegitimateProcess(name) {
    const legit = ['node', 'python', 'nginx', 'apache', 'mysql', 'postgres', 'java', 'docker'];
    return legit.some(l => name?.toLowerCase().includes(l));
  }

  isCommonServicePort(port) {
    const common = [22, 80, 443, 3306, 5432, 6379, 27017, 3000, 5173, 8080];
    return common.includes(port);
  }

  isPrivateIP(ip) {
    return ip?.startsWith('192.168.') || ip?.startsWith('10.') || ip?.startsWith('172.');
  }
}

module.exports = SecurityModules;
