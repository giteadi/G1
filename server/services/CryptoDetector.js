'use strict';

const { execSync } = require('child_process');
const si = require('systeminformation');
const logger = require('../utils/logger');

class CryptoDetector {
  constructor(config = {}) {
    this.config = config;
    this.detectionHistory = [];
    this.suspiciousProcessHistory = new Map();

    this.minerSignatures = [
      'xmrig', 'minergate', 'cryptonight', 'coinhive',
      'cpuminer', 'cgminer', 'ethminer', 'nicehash', 'claymore',
      'minerd', 'cryptominer', 'coin-hive', 'kworkerds', 'sysupdate',
      'watchbog', 'netns', 'donutd', 'sysguard', 'sysdrr',
      'crontabs', 'bash2', 'bashd', 'systemc', 'sshd2',
      'dbused', 'netstat', 'pamd', 'pkills', 'xmr',
      'stratum', 'pool', 'mining', 'hashrate', 'worker'
    ];

    this.macosSystemProcs = [
      'networkserviceproxy', 'trustd', 'syspolicyd', 'mobileassetd',
      'coreauthd', 'secinitd', 'logd', 'configd', 'notifyd',
      'diskarbitrationd', 'locationd', 'mediaanalysisd', 'tgondevice',
      'useractivityd', 'apsd', 'symptomsd', 'wifid', 'bluetoothd'
    ];

    this.legitimateProcs = [
      'node', 'python', 'python3', 'java', 'nginx', 'apache',
      'apache2', 'mysql', 'mysqld', 'postgres', 'ruby', 'php',
      'redis', 'mongodb', 'elasticsearch', 'webpack', 'tsc',
      'cargo', 'rustc', 'gcc', 'clang', 'make', 'cmake', 'npm',
      'yarn', 'docker', 'containerd', 'kubelet'
    ];

    this.behaviorThresholds = {
      cpuThreshold: 75,
      cpuSustainedTime: 30000,
      networkThreshold: 5000000,
      restartCount: 3
    };
  }

  async detect() {
    const findings = [];
    const behaviors = [];

    const detectionChecks = await Promise.allSettled([
      this.checkBySignatures(),
      this.checkByBehavior(),
      this.checkByParentProcess(),
      this.checkByFileIntegrity(),
      this.checkByCronBackdoors(),
      this.checkBySystemdServices(),
      this.checkByNetworkConnections(),
      this.checkByHiddenProcesses()
    ]);

    detectionChecks.forEach((check, index) => {
      if (check.status === 'fulfilled') {
        const result = check.value;
        if (result.findings?.length) {
          findings.push(...result.findings);
        }
        if (result.behaviors?.length) {
          behaviors.push(...result.behaviors);
        }
      }
    });

    const correlated = this.correlateThreats(findings, behaviors);

    return {
      module: 'crypto_detector',
      status: correlated.length ? 'threat' : 'clean',
      message: correlated.length ? `${correlated.length} crypto threat(s) detected` : 'No crypto miners detected',
      findings: correlated,
      behaviors,
      confidence: this.calculateConfidence(findings, behaviors)
    };
  }

  async checkBySignatures() {
    const findings = [];
    try {
      const procs = await si.processes();

      for (const p of procs.list) {
        const cmd = (p.name + ' ' + (p.command || '')).toLowerCase();

        if (this.macosSystemProcs.some(s => cmd.includes(s))) continue;

        const matchedSignature = this.minerSignatures.find(sig => {
          const regex = new RegExp(`(^|[\\s/])${sig}([\\s$]|$)`, 'i');
          return regex.test(cmd);
        });

        if (matchedSignature) {
          findings.push({
            type: 'signature_match',
            severity: 'critical',
            process: p.name,
            pid: p.pid,
            cpu: p.cpu,
            signature: matchedSignature,
            command: p.command,
            message: `Known miner signature '${matchedSignature}' in ${p.name} (PID: ${p.pid})`
          });
        }
      }
    } catch (e) {
      logger.error(`Signature check error: ${e.message}`);
    }

    return { findings };
  }

  async checkByBehavior() {
    const findings = [];
    const behaviors = [];

    try {
      const [cpu, processes, network] = await Promise.all([
        si.currentLoad(),
        si.processes(),
        si.networkConnections()
      ]);

      const highCpuProcs = processes.list.filter(p =>
        p.cpu > this.behaviorThresholds.cpuThreshold &&
        p.pid > 1000 &&
        !this.legitimateProcs.some(s => p.name?.toLowerCase().includes(s)) &&
        !this.macosSystemProcs.some(s => p.name?.toLowerCase().includes(s))
      );

      for (const proc of highCpuProcs) {
        const key = `${proc.name}:${proc.pid}`;
        const history = this.suspiciousProcessHistory.get(key) || { count: 0, firstSeen: Date.now() };
        history.count++;
        history.lastSeen = Date.now();
        this.suspiciousProcessHistory.set(key, history);

        const sustainedTime = history.lastSeen - history.firstSeen;
        const isPersistent = sustainedTime > this.behaviorThresholds.cpuSustainedTime;

        if (isPersistent && history.count >= 2) {
          behaviors.push({
            type: 'persistent_high_cpu',
            process: proc.name,
            pid: proc.pid,
            cpu: proc.cpu,
            duration: sustainedTime,
            restarts: history.count
          });

          findings.push({
            type: 'behavior_anomaly',
            severity: 'high',
            process: proc.name,
            pid: proc.pid,
            cpu: proc.cpu,
            behavior: 'persistent_high_cpu',
            duration: sustainedTime,
            message: `Suspicious: ${proc.name} using ${proc.cpu.toFixed(1)}% CPU for ${(sustainedTime / 1000).toFixed(0)}s`
          });
        }
      }

      const suspiciousOutbound = network.filter(conn =>
        conn.state === 'ESTABLISHED' &&
        conn.peerPort &&
        [3333, 45700, 45560, 7777, 9999, 14444, 45743].includes(conn.peerPort)
      );

      if (suspiciousOutbound.length > 0) {
        behaviors.push({
          type: 'mining_pool_connection',
          connections: suspiciousOutbound.length,
          ports: [...new Set(suspiciousOutbound.map(c => c.peerPort))]
        });

        findings.push({
          type: 'network_anomaly',
          severity: 'critical',
          behavior: 'mining_pool_connection',
          connections: suspiciousOutbound,
          message: `Mining pool connection detected on port(s): ${[...new Set(suspiciousOutbound.map(c => c.peerPort))].join(', ')}`
        });
      }
    } catch (e) {
      logger.error(`Behavior check error: ${e.message}`);
    }

    return { findings, behaviors };
  }

  async checkByParentProcess() {
    const findings = [];
    try {
      const procs = await si.processes();
      const procMap = new Map(procs.list.map(p => [p.pid, p]));

      for (const p of procs.list) {
        if (!p.ppid || p.ppid < 2) continue;

        const parent = procMap.get(p.ppid);
        if (!parent) continue;

        const cmd = (p.name + ' ' + (p.command || '')).toLowerCase();
        const parentCmd = (parent.name + ' ' + (parent.command || '')).toLowerCase();

        const isSuspiciousChild =
          this.minerSignatures.some(sig => cmd.includes(sig)) ||
          (p.cpu > 50 && parentCmd.includes('bash') && cmd.includes('bash')) ||
          (parentCmd.includes('curl') || parentCmd.includes('wget'));

        if (isSuspiciousChild) {
          findings.push({
            type: 'suspicious_parent_child',
            severity: 'high',
            process: p.name,
            pid: p.pid,
            parent: parent.name,
            ppid: p.ppid,
            cpu: p.cpu,
            message: `Suspicious process chain: ${parent.name}(${p.ppid}) → ${p.name}(${p.pid})`
          });
        }
      }
    } catch (e) {
      logger.error(`Parent process check error: ${e.message}`);
    }

    return { findings };
  }

  async checkByFileIntegrity() {
    const findings = [];
    try {
      const suspiciousPaths = [
        '/tmp', '/var/tmp', '/dev/shm', '/var/run',
        '/usr/local/bin', '/usr/local/sbin', '/opt'
      ];

      for (const path of suspiciousPaths) {
        try {
          const files = execSync(`find ${path} -type f -perm -111 2>/dev/null | head -20 || true`).toString().trim();
          if (files) {
            files.split('\n').forEach(file => {
              if (!file) return;
              const basename = file.split('/').pop().toLowerCase();
              if (this.minerSignatures.some(sig => basename.includes(sig))) {
                findings.push({
                  type: 'suspicious_executable',
                  severity: 'critical',
                  path: file,
                  signature: this.minerSignatures.find(sig => basename.includes(sig)),
                  message: `Suspicious executable found: ${file}`
                });
              }
            });
          }
        } catch {}
      }
    } catch (e) {
      logger.error(`File integrity check error: ${e.message}`);
    }

    return { findings };
  }

  async checkByCronBackdoors() {
    const findings = [];
    try {
      const cronLocations = [
        '/etc/crontab',
        '/etc/cron.d/*',
        '/var/spool/cron/*',
        '/etc/cron.daily/*',
        '/etc/cron.hourly/*'
      ];

      for (const location of cronLocations) {
        try {
          const content = execSync(`cat ${location} 2>/dev/null || true`).toString();

          const suspiciousPatterns = [
            /wget\s+.*\|.*bash/i,
            /curl\s+.*\|.*bash/i,
            /base64\s+-d/i,
            /\/dev\/tcp\//i,
            /\$\(curl/i,
            /\$\(wget/i,
            /bash\s+-c/i,
            /perl\s+-e/i,
            /python\s+-c/i
          ];

          suspiciousPatterns.forEach(pattern => {
            if (pattern.test(content)) {
              findings.push({
                type: 'cron_backdoor',
                severity: 'critical',
                location: location,
                pattern: pattern.toString(),
                message: `Backdoor pattern in cron: ${location}`
              });
            }
          });
        } catch {}
      }

      const userCrons = execSync('crontab -l 2>/dev/null || true').toString();
      if (userCrons.includes('wget') || userCrons.includes('curl') || userCrons.includes('base64')) {
        findings.push({
          type: 'user_cron_backdoor',
          severity: 'critical',
          message: 'Suspicious user crontab detected'
        });
      }
    } catch (e) {
      logger.error(`Cron backdoor check error: ${e.message}`);
    }

    return { findings };
  }

  async checkBySystemdServices() {
    const findings = [];
    try {
      const services = execSync('systemctl list-unit-files --type=service --state=enabled 2>/dev/null || true').toString();

      const suspiciousServicePatterns = [
        /xmr/i, /miner/i, /crypto/i, /mining/i,
        /update\.service/i, /sysguard/i, /netns/i
      ];

      const serviceLines = services.split('\n');
      for (const line of serviceLines) {
        for (const pattern of suspiciousServicePatterns) {
          if (pattern.test(line)) {
            findings.push({
              type: 'suspicious_systemd_service',
              severity: 'critical',
              service: line.trim().split(/\s+/)[0],
              pattern: pattern.toString(),
              message: `Suspicious systemd service: ${line.trim()}`
            });
          }
        }
      }
    } catch (e) {
      logger.error(`Systemd service check error: ${e.message}`);
    }

    return { findings };
  }

  async checkByNetworkConnections() {
    const findings = [];
    try {
      const connections = await si.networkConnections();

      const miningPoolPorts = [3333, 4444, 5555, 7777, 8080, 45700, 45560, 14444, 45743];
      const stratumPatterns = connections.filter(c =>
        miningPoolPorts.includes(c.peerPort) &&
        c.state === 'ESTABLISHED'
      );

      for (const conn of stratumPatterns) {
        try {
          const pid = conn.pid || this.findPidByPort(conn.localPort);
          if (pid) {
            const proc = await si.processes().then(p => p.list.find(x => x.pid === pid));
            if (proc && !this.legitimateProcs.some(l => proc.name?.toLowerCase().includes(l))) {
              findings.push({
                type: 'mining_pool_traffic',
                severity: 'critical',
                process: proc.name,
                pid: proc.pid,
                peer: `${conn.peerAddress}:${conn.peerPort}`,
                message: `Mining pool traffic: ${proc.name} → ${conn.peerAddress}:${conn.peerPort}`
              });
            }
          }
        } catch {}
      }
    } catch (e) {
      logger.error(`Network connection check error: ${e.message}`);
    }

    return { findings };
  }

  async checkByHiddenProcesses() {
    const findings = [];
    try {
      const psOutput = execSync('ps auxf 2>/dev/null || true').toString();
      const hiddenSignatures = ['kworkerds', 'sysupdate', 'netns', 'donutd', '[kworker]'];

      for (const sig of hiddenSignatures) {
        if (psOutput.includes(sig)) {
          findings.push({
            type: 'hidden_process',
            severity: 'critical',
            signature: sig,
            message: `Hidden process signature detected: ${sig}`
          });
        }
      }

      const kernelThreads = psOutput.match(/\[kworker\/\d+:\d+\]/g) || [];
      const suspiciousKworkers = kernelThreads.filter(k => {
        const match = k.match(/\[kworker\/(\d+):\d+\]/);
        if (match) {
          const cpu = parseInt(match[1]);
          return cpu > 10;
        }
        return false;
      });

      if (suspiciousKworkers.length > 0) {
        findings.push({
          type: 'fake_kernel_thread',
          severity: 'critical',
          processes: suspiciousKworkers,
          message: `Fake kernel threads detected: ${suspiciousKworkers.join(', ')}`
        });
      }
    } catch (e) {
      logger.error(`Hidden process check error: ${e.message}`);
    }

    return { findings };
  }

  correlateThreats(findings, behaviors) {
    const correlated = [];
    const byPid = new Map();

    findings.forEach(f => {
      if (f.pid) {
        const existing = byPid.get(f.pid) || [];
        existing.push(f);
        byPid.set(f.pid, existing);
      } else {
        correlated.push(f);
      }
    });

    byPid.forEach((items, pid) => {
      const processName = items[0].process;
      const types = [...new Set(items.map(i => i.type))];
      const severity = items.some(i => i.severity === 'critical') ? 'critical' :
                       items.some(i => i.severity === 'high') ? 'high' : 'medium';

      correlated.push({
        type: 'correlated_threat',
        severity,
        process: processName,
        pid,
        indicators: types,
        findings: items,
        confidence: items.length,
        message: `Confirmed crypto miner: ${processName} (PID: ${pid}) - ${types.length} indicators`
      });
    });

    return correlated;
  }

  calculateConfidence(findings, behaviors) {
    let score = 0;
    score += findings.filter(f => f.severity === 'critical').length * 3;
    score += findings.filter(f => f.severity === 'high').length * 2;
    score += findings.filter(f => f.severity === 'medium').length;
    score += behaviors.length;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  findPidByPort(port) {
    try {
      const output = execSync(`lsof -ti :${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null || true`).toString().trim();
      return output ? parseInt(output.split('\n')[0]) : null;
    } catch {
      return null;
    }
  }

  async isolateProcess(pid) {
    try {
      execSync(`kill -STOP ${pid} 2>/dev/null || true`);
      logger.warn(`Process ${pid} paused (isolated)`);
      return { success: true, action: 'isolated', pid };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async terminateProcess(pid) {
    try {
      execSync(`kill -9 ${pid} 2>/dev/null || true`);
      logger.warn(`Process ${pid} killed`);
      return { success: true, action: 'killed', pid };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async removeFiles(paths) {
    const results = [];
    for (const path of paths) {
      try {
        execSync(`rm -rf ${path} 2>/dev/null || true`);
        results.push({ path, removed: true });
      } catch (e) {
        results.push({ path, removed: false, error: e.message });
      }
    }
    return results;
  }
}

module.exports = CryptoDetector;
