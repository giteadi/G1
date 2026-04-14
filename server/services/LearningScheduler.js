'use strict';

/**
 * LearningScheduler — G1 ki "padhai ka schedule"
 * 
 * Yeh module G1 daemon ke saath chalta hai aur:
 *  - Har 6 ghante: Internet se naye threat intelligence fetch karo
 *  - Har raat 3 baje: Unsure queue process karo (GPT se pooch)  
 *  - Har Sunday: Self-audit karo, purani/galat rules clean karo
 *  - Har minute: Server se live events pakad ke SelfLearner ko bhejo
 *  - Har ghante: Learning stats save karo
 */

const cron        = require('node-cron');
const fs          = require('fs');
const path        = require('path');
const si          = require('systeminformation');
const { execSync } = require('child_process');
const SelfLearner  = require('./SelfLearner');

const STATS_FILE = path.join(process.env.HOME || '/root', '.g1', 'learning_stats.json');

class LearningScheduler {
  constructor(config) {
    this.config  = config;
    this.learner = new SelfLearner(config);
    this.stats   = { sessions: 0, total_learned: 0, gpt_consultations: 0, intel_updates: 0 };
  }

  start() {
    console.log('[G1-LEARN] Learning scheduler started');
    this._logStats();

    // ── Har 2 min: Live server events collect karo ──────────────────────────
    cron.schedule('*/2 * * * *', async () => {
      await this._collectAndLearnFromServer();
    });

    // ── Har 6 ghante: Threat intel update ──────────────────────────────────
    cron.schedule('0 */6 * * *', async () => {
      console.log('[G1-LEARN] Starting threat intel refresh...');
      const result = await this.learner.fetchAndLearnThreatIntel();
      this.stats.intel_updates++;
      this.stats.total_learned += result.added;
      this._saveStats();
      console.log(`[G1-LEARN] Intel update done: +${result.added} rules (total ${result.total})`);
    });

    // ── Raat 3 baje: Unsure queue process karo ─────────────────────────────
    cron.schedule('0 3 * * *', async () => {
      console.log('[G1-LEARN] Processing unsure event queue...');
      await this.learner.processUnsureQueue();
      this.stats.gpt_consultations++;
      this._saveStats();
    });

    // ── Sunday 4 baje: Weekly self-audit ───────────────────────────────────
    cron.schedule('0 4 * * 0', async () => {
      console.log('[G1-LEARN] Starting weekly self-audit...');
      const audit = await this.learner.selfAudit();
      if (audit) {
        console.log(`[G1-LEARN] Audit: kept=${audit.keep?.length}, removed=${audit.remove?.length}`);
      }
      this._saveStats();
    });

    // ── Har ghante: Stats save karo ────────────────────────────────────────
    cron.schedule('0 * * * *', () => {
      this._saveStats();
    });

    // Startup pe bhi ek baar intel fetch karo (delay ke saath)
    setTimeout(async () => {
      console.log('[G1-LEARN] Initial threat intel fetch...');
      await this.learner.fetchAndLearnThreatIntel().catch(e => console.log('[G1-LEARN]', e.message));
    }, 30000); // 30 seconds baad
  }

  // ── Live server events collect karo ──────────────────────────────────────
  async _collectAndLearnFromServer() {
    const events = await this._gatherServerEvents();
    for (const event of events) {
      const result = await this.learner.evaluate(event);
      if (result.matched && result.verdict !== 'unknown') {
        this.stats.sessions++;
        if (result.verdict === 'gpt_learned') this.stats.gpt_consultations++;
        if (result.verdict === 'gpt_learned') this.stats.total_learned++;
      }
    }
  }

  async _gatherServerEvents() {
    const events = [];

    try {
      // 1. Processes check
      const procs = await si.processes();
      const suspiciousKeywords = ['xmrig','minergate','cpuminer','cryptominer','kworkerds','sysupdate','networkservice','watchbog','xmr','monero'];
      for (const p of procs.list) {
        const nameCmd = ((p.name || '') + ' ' + (p.command || '')).toLowerCase();
        if (suspiciousKeywords.some(k => nameCmd.includes(k))) {
          events.push({ type: 'process', process_name: p.name, command: p.command, pid: p.pid, cpu: p.cpu, user: p.user });
        }
        // Bahut zyada CPU (unknown process)
        if (p.cpu > 85 && p.pid > 1000 && !['node','python','java','nginx','apache','php','mysql','postgres','ruby'].some(s => p.name?.includes(s))) {
          events.push({ type: 'process', process_name: p.name, command: p.command, pid: p.pid, cpu: p.cpu, flag: 'high_cpu' });
        }
      }
    } catch {}

    try {
      // 2. Auth failures
      const logFiles = ['/var/log/auth.log', '/var/log/secure'];
      for (const f of logFiles) {
        if (!fs.existsSync(f)) continue;
        const lines = execSync(`tail -100 ${f} 2>/dev/null`).toString().split('\n');
        const ipCounts = {};
        lines.forEach(l => {
          if (l.includes('Failed password') || l.includes('Invalid user')) {
            const m = l.match(/from\s+(\d+\.\d+\.\d+\.\d+)/);
            if (m) ipCounts[m[1]] = (ipCounts[m[1]] || 0) + 1;
          }
        });
        for (const [ip, count] of Object.entries(ipCounts)) {
          if (count >= 4) events.push({ type: 'auth_failures', ip, count, raw_text: `${count} failed ssh attempts from ${ip}` });
        }
        break;
      }
    } catch {}

    try {
      // 3. Open ports check
      const portOutput = execSync('ss -tlnp 2>/dev/null').toString();
      const dangerPorts = [4444, 4445, 1337, 31337, 6666, 12345, 54321, 9999, 8888];
      for (const port of dangerPorts) {
        if (portOutput.includes(`:${port} `)) {
          events.push({ type: 'port_open', port, raw_text: `Dangerous port ${port} is open` });
        }
      }
    } catch {}

    try {
      // 4. Suspicious cron content
      const cronCheck = execSync('crontab -l 2>/dev/null; cat /etc/cron.d/* 2>/dev/null | head -200').toString();
      if (cronCheck.length > 10) {
        events.push({ type: 'cron_content', content: cronCheck.substring(0, 500) });
      }
    } catch {}

    try {
      // 5. Network connections to bad ports
      const netOut = execSync('ss -tnp state established 2>/dev/null').toString();
      const lines  = netOut.split('\n').slice(1);
      for (const line of lines) {
        const m = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)\s/g);
        if (m && m.length >= 2) {
          const peerPort = parseInt((m[1] || '').split(':')[1]);
          const peerIP   = (m[1] || '').split(':')[0];
          if ([4444,1337,31337,6666].includes(peerPort)) {
            events.push({ type: 'network', remote_ip: peerIP, remote_port: peerPort, raw_text: `Connection to ${peerIP}:${peerPort}` });
          }
        }
      }
    } catch {}

    return events;
  }

  _logStats() {
    const s = this.learner.getStats();
    console.log(`[G1-LEARN] Rules loaded: ${s.total_rules} (builtin=${s.builtin}, gpt=${s.gpt_learned}, intel=${s.intel_learned})`);
  }

  _saveStats() {
    const learnerStats = this.learner.getStats();
    const combined = { ...this.stats, ...learnerStats, saved_at: new Date().toISOString() };
    try { fs.writeFileSync(STATS_FILE, JSON.stringify(combined, null, 2)); } catch {}
  }

  getLearner() { return this.learner; }
}

module.exports = LearningScheduler;
