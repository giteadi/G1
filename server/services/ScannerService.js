'use strict';

const { execSync } = require('child_process');
const si = require('systeminformation');

class ScannerService {
  constructor(config) {
    this.config = config;
    this.suspiciousKeywords = [
      'xmrig', 'minergate', 'cryptonight', 'monero', 'coinhive',
      'cpuminer', 'cgminer', 'ethminer', 'nicehash', 'claymore',
      'minerd', 'cryptominer', 'coin-hive', 'kworkerds', 'sysupdate',
      'networkservice', 'watchbog'
    ];
  }

  async fullScan(deep = false) {
    const results = await Promise.allSettled([
      this.checkCryptoMiners(),
      this.checkRootkit(),
      this.checkSuspiciousCrons(),
      this.checkOpenPorts(),
      this.checkSuspiciousSudoers(),
      this.checkSSHConfig(),
      this.checkWorldWritable(),
      deep ? this.checkHiddenProcesses() : Promise.resolve({ module: 'hidden_processes', status: 'skipped', message: 'Use --deep to run' })
    ]);

    return results.map(r => r.status === 'fulfilled' ? r.value : { module: 'error', status: 'error', message: r.reason?.message });
  }

  async checkCryptoMiners() {
    const findings = [];
    try {
      const procs = await si.processes();
      procs.list.forEach(p => {
        const cmd = (p.name + ' ' + (p.command || '')).toLowerCase();
        if (this.suspiciousKeywords.some(m => cmd.includes(m))) {
          findings.push(`Suspected miner: ${p.name} (PID: ${p.pid}, CPU: ${p.cpu}%)`);
        }
      });

      const highCpu = procs.list.filter(p => p.cpu > 85 && p.pid > 1000);
      if (highCpu.length > 0) {
        findings.push(...highCpu.map(p => `High CPU process: ${p.name} (PID: ${p.pid}, ${p.cpu}%)`));
      }
    } catch (e) {}

    return {
      module: 'crypto_miners',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} suspicious process(es)` : 'No miners detected',
      findings
    };
  }

  async checkRootkit() {
    const findings = [];
    try {
      const result = execSync('rkhunter --check --sk --rwo 2>/dev/null || chkrootkit 2>/dev/null | grep INFECTED || echo "scanner_not_installed"').toString();
      if (result.includes('INFECTED') || result.includes('Warning')) {
        result.split('\n').filter(l => l.includes('INFECTED') || l.includes('Warning')).forEach(l => findings.push(l.trim()));
      }
    } catch (e) {}

    return {
      module: 'rootkit_scan',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} rootkit warning(s)` : 'No rootkits detected',
      findings
    };
  }

  async checkSuspiciousCrons() {
    const findings = [];
    try {
      const cronFiles = ['/etc/crontab', '/etc/cron.d/*', '/var/spool/cron/*', '/etc/cron.daily/*'];
      for (const file of cronFiles) {
        try {
          const content = execSync(`cat ${file} 2>/dev/null || true`).toString();
          if (content.includes('wget') || content.includes('curl') || content.includes('base64') || content.includes('/dev/tcp')) {
            findings.push(`Suspicious cron in ${file}`);
          }
        } catch (e) {}
      }
    } catch (e) {}

    return {
      module: 'suspicious_crons',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} suspicious cron(s)` : 'No suspicious crons',
      findings
    };
  }

  async checkOpenPorts() {
    const findings = [];
    try {
      const ports = await si.networkConnections();
      const suspiciousPorts = ports.filter(p => [4444, 5555, 6666, 7777, 8888, 9999, 1337].includes(p.localPort));
      if (suspiciousPorts.length > 0) {
        findings.push(...suspiciousPorts.map(p => `Suspicious port ${p.localPort} open (${p.state})`));
      }
    } catch (e) {}

    return {
      module: 'open_ports',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} suspicious port(s)` : 'No suspicious ports',
      findings
    };
  }

  async checkSuspiciousSudoers() {
    const findings = [];
    try {
      const sudoers = execSync('cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null || true').toString();
      if (sudoers.includes('NOPASSWD') || sudoers.includes('ALL')) {
        findings.push('Review sudoers for NOPASSWD/ALL privileges');
      }
    } catch (e) {}

    return {
      module: 'sudoers_check',
      status: findings.length ? 'warning' : 'clean',
      message: findings.length ? 'Sudoers needs review' : 'Sudoers looks clean',
      findings
    };
  }

  async checkSSHConfig() {
    const findings = [];
    try {
      const sshConfig = execSync('cat /etc/ssh/sshd_config 2>/dev/null || true').toString();
      if (sshConfig.includes('PasswordAuthentication yes') || sshConfig.includes('PermitRootLogin yes')) {
        findings.push('SSH allows password auth or root login');
      }
    } catch (e) {}

    return {
      module: 'ssh_config',
      status: findings.length ? 'warning' : 'clean',
      message: findings.length ? 'SSH config needs hardening' : 'SSH config looks good',
      findings
    };
  }

  async checkWorldWritable() {
    const findings = [];
    try {
      const result = execSync('find /tmp /var/tmp -type f -perm -002 2>/dev/null | head -20 || true').toString();
      if (result.trim()) {
        findings.push(...result.trim().split('\n').filter(Boolean));
      }
    } catch (e) {}

    return {
      module: 'world_writable',
      status: findings.length ? 'warning' : 'clean',
      message: findings.length ? `${findings.length} world-writable file(s)` : 'No world-writable files',
      findings
    };
  }

  async checkHiddenProcesses() {
    const findings = [];
    try {
      const psResult = execSync('ps auxf 2>/dev/null || true').toString();
      const netstatResult = execSync('netstat -tulpn 2>/dev/null || ss -tulpn 2>/dev/null || true').toString();
      
      if (psResult.includes('kworkerds') || psResult.includes('sysupdate')) {
        findings.push('Potential hidden process detected');
      }
    } catch (e) {}

    return {
      module: 'hidden_processes',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? 'Hidden process suspected' : 'No hidden processes',
      findings
    };
  }
}

module.exports = ScannerService;
