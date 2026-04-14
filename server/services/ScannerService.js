'use strict';

const { execSync } = require('child_process');
const si = require('systeminformation');
const CryptoDetector = require('./CryptoDetector');
const ServerProtection = require('./ServerProtection');

class ScannerService {
  constructor(config) {
    this.config = config;
    this.cryptoDetector = new CryptoDetector(config);
    this.serverProtection = new ServerProtection(config);
    
    // Strict keywords - 'networkservice' and 'monero' removed to avoid false positives
    this.suspiciousKeywords = [
      'xmrig', 'minergate', 'cryptonight', 'coinhive',
      'cpuminer', 'cgminer', 'ethminer', 'nicehash', 'claymore',
      'minerd', 'cryptominer', 'coin-hive', 'kworkerds', 'sysupdate',
      'watchbog'
    ];
    
    // macOS system processes whitelist
    this.macosSystemProcs = [
      'networkserviceproxy', 'trustd', 'syspolicyd', 'mobileassetd',
      'coreauthd', 'secinitd', 'logd', 'configd', 'notifyd',
      'diskarbitrationd', 'locationd', 'mediaanalysisd', 'tgondevice',
      'useractivityd', 'apsd', 'symptomsd', 'wifid', 'bluetoothd'
    ];
  }

  async fullScan(deep = false, type = 'full') {
    const baseChecks = [
      type === 'full' || type === 'crypto' ? this.cryptoDetector.detect() : null,
      type === 'full' || type === 'rootkit' ? this.checkRootkit() : null,
      type === 'full' || type === 'cron' ? this.checkSuspiciousCrons() : null,
      type === 'full' || type === 'ports' ? this.checkOpenPorts() : null,
      type === 'full' ? this.checkSuspiciousSudoers() : null,
      type === 'full' || type === 'ssh' ? this.checkSSHConfig() : null,
      type === 'full' ? this.checkWorldWritable() : null,
      type === 'full' || type === 'privacy' ? this.checkPrivacyLeaks() : null,
      type === 'full' || type === 'darkweb' ? this.checkDarkWebConnections() : null,
      type === 'full' || type === 'protection' ? this.checkServerProtection() : null,
      deep ? this.checkHiddenProcesses() : Promise.resolve({ module: 'hidden_processes', status: 'skipped', message: 'Use --deep to run' })
    ].filter(Boolean);

    const results = await Promise.allSettled(baseChecks);
    return results.map(r => r.status === 'fulfilled' ? r.value : { module: 'error', status: 'error', message: r.reason?.message });
  }

  async checkServerProtection() {
    const findings = [];
    try {
      const status = await this.serverProtection.checkProtectionStatus();

      if (!status.firewall) {
        findings.push('Firewall is not enabled');
      }
      if (!status.fail2ban) {
        findings.push('Fail2ban intrusion prevention is not active');
      }
      if (!status.ssh_hardened) {
        findings.push('SSH configuration needs hardening');
      }
      if (!status.intrusion_detection) {
        findings.push('Intrusion detection tools not installed');
      }

      const vulns = await this.serverProtection.scanForVulnerabilities();
      findings.push(...vulns.map(v => `${v.type}: ${v.message}`));

    } catch (e) {}

    return {
      module: 'server_protection',
      status: findings.length ? 'warning' : 'clean',
      message: findings.length ? `${findings.length} protection issue(s) found` : 'Server protection looks good',
      findings
    };
  }

  async checkCryptoMiners() {
    const findings = [];
    try {
      const procs = await si.processes();
      procs.list.forEach(p => {
        const cmd = (p.name + ' ' + (p.command || '')).toLowerCase();
        
        // macOS system process? Skip
        if (this.macosSystemProcs.some(s => cmd.includes(s))) return;
        
        // Strict word boundary match to avoid false positives
        const isSuspicious = this.suspiciousKeywords.some(k => {
          const regex = new RegExp(`(^|[\\s/])${k}([\\s$]|$)`, 'i');
          return regex.test(cmd);
        });
        
        if (isSuspicious) {
          findings.push(`Suspected miner: ${p.name} (PID: ${p.pid}, CPU: ${p.cpu}%)`);
        }
      });

      // High CPU — but macOS system procs excluded
      const highCpu = procs.list.filter(p =>
        p.cpu > 85 &&
        p.pid > 1000 &&
        !this.macosSystemProcs.some(s => p.name?.toLowerCase().includes(s))
      );
      
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

  async checkPrivacyLeaks() {
    const findings = [];
    try {
      // macOS system processes whitelist - comprehensive list
      const macosSystemProcs = [
        // Apple system services
        'callserviced', 'callservi',
        'corespeechd', 'corespeec',
        'powerchime', 'powerchim',
        'coreaudiod', 'coreaudio',
        'appleh264', 'appleh26',
        'avfoundation', 'avfoundat',
        'usernoted', 'usernotif', 'notificat',
        'imagent', 'imavagent',
        'com.apple', 'apple.',
        'controlce', 'controlcenter',
        'windowser', 'windowserver',
        'kernel_ta', 'kernel',
        'systemsta', 'systemstats',
        // Legitimate apps
        'facetime', 'quicktime', 'music', 'safari',
        'spotify', 'zoom', 'teams', 'slack', 'discord',
        'chrome', 'firefox', 'skype', 'webex', 'google', 'microsoft'
      ];

      // Mic/Camera access check - macOS
      const audioCheck = execSync(
        'lsof 2>/dev/null | grep -iE "coreaudio|AppleHDA|iSight|FaceTime|avfoundation" 2>/dev/null || true'
      ).toString().trim();
      
      if (audioCheck) {
        audioCheck.split('\n').filter(Boolean).forEach(line => {
          const procName = line.split(/\s+/)[0]?.toLowerCase() || '';
          
          // Skip if it's a known system process (check for partial matches)
          if (macosSystemProcs.some(sys => procName.includes(sys) || sys.includes(procName.substring(0, 8)))) {
            return;
          }
          
          // Skip if it's empty or too short
          if (procName.length < 3) return;
          
          findings.push(`Unexpected mic/camera access: ${line.split(/\s+/)[0]}`);
        });
      }

      // Linux mic check
      const linuxAudio = execSync(
        'lsof /dev/snd/* /dev/audio /dev/dsp 2>/dev/null | grep -v "pulse\\|alsa\\|system" || true'
      ).toString().trim();
      
      if (linuxAudio) {
        linuxAudio.split('\n').filter(Boolean).forEach(line => {
          const procName = line.split(/\s+/)[0]?.toLowerCase() || '';
          
          // Skip known system processes
          if (macosSystemProcs.some(sys => procName.includes(sys) || sys.includes(procName.substring(0, 8)))) {
            return;
          }
          
          if (procName.length < 3) return;
          
          findings.push(`Audio device access: ${line.split(/\s+/)[0]}`);
        });
      }
    } catch(e) {}

    return {
      module: 'privacy_leaks',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} suspicious device access(es)` : 'No privacy leaks detected',
      findings
    };
  }

  async checkDarkWebConnections() {
    const findings = [];
    try {
      // Tor traffic check - port 9050/9150
      const torCheck = execSync(
        'netstat -an 2>/dev/null || ss -an 2>/dev/null || true'
      ).toString();
      
      if (torCheck.includes(':9050') || torCheck.includes(':9150')) {
        findings.push('Tor connection detected (port 9050/9150) — possible dark web traffic');
      }

      // Known Tor exit node ports
      const connections = await si.networkConnections();
      const darkWebPorts = [9001, 9030, 9050, 9051, 9150, 9151];
      
      connections.forEach(c => {
        if (darkWebPorts.includes(c.peerPort) || darkWebPorts.includes(c.localPort)) {
          findings.push(`Dark web port active: ${c.localPort} → ${c.peerAddress}:${c.peerPort}`);
        }
      });

      // Suspicious outbound to unknown IPs on weird ports
      const suspiciousOutbound = connections.filter(c =>
        c.state === 'ESTABLISHED' &&
        c.peerAddress &&
        !['192.168', '10.', '127.', '::1', 'fe80'].some(local => c.peerAddress.startsWith(local)) &&
        [4444, 4445, 1337, 31337, 6666, 6667, 6697].includes(c.peerPort)
      );
      
      suspiciousOutbound.forEach(c => {
        findings.push(`Suspicious outbound C2 connection: ${c.peerAddress}:${c.peerPort}`);
      });

      // Data exfiltration check - unusual upload spike
      const { tx_per_sec } = await this.getNetworkSpeedLocal();
      if (tx_per_sec > 10_000_000) { // 10MB/s upload
        findings.push(`High upload detected: ${(tx_per_sec/1_000_000).toFixed(1)} MB/s — possible data exfil`);
      }
    } catch(e) {}

    return {
      module: 'darkweb_connections',
      status: findings.length ? 'threat' : 'clean',
      message: findings.length ? `${findings.length} dark web/C2 indicator(s)` : 'No dark web activity detected',
      findings
    };
  }

  // ScannerService ke liye local network speed helper
  async getNetworkSpeedLocal() {
    try {
      const net1 = await si.networkStats();
      await new Promise(r => setTimeout(r, 1000));
      const net2 = await si.networkStats();
      return {
        rx_per_sec: Math.max(0, (net2[0]?.rx_bytes || 0) - (net1[0]?.rx_bytes || 0)),
        tx_per_sec: Math.max(0, (net2[0]?.tx_bytes || 0) - (net1[0]?.tx_bytes || 0))
      };
    } catch {
      return { rx_per_sec: 0, tx_per_sec: 0 };
    }
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
