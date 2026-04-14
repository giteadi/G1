'use strict';

/**
 * G1 SelfLearner — The engine that makes G1 smarter over time.
 *
 * Kaise kaam karta hai:
 *  1. Har event aata hai -> known patterns se match karo
 *  2. Match nahi hua -> GPT se pooch, full context ke saath
 *  3. GPT jawab deta hai -> nayi rule extract karo
 *  4. Rule validate karo -> rules.json mein permanently save karo
 *  5. Agli baar wohi pattern aaye -> GPT ki zaroorat nahi, khud handle
 *  6. Raat ko: internet se naye CVE/attack patterns fetch karo
 *  7. Weekly: apni rules GPT se audit karwao, outdated hatao
 */

const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');
const RULES_FILE   = path.join(DATA_DIR, 'learned_rules.json');
const MEMORY_FILE  = path.join(DATA_DIR, 'pattern_memory.json');
const LEARN_LOG    = path.join(DATA_DIR, 'learning.log');
const UNSURE_QUEUE = path.join(DATA_DIR, 'unsure_queue.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function appendLog(msg) {
  ensureDir();
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LEARN_LOG, line);
  console.log('[G1-LEARN]', msg);
}

// ── Builtin seed rules (G1 already jaanta hai yeh) ───────────────────────────

const SEED_RULES = [
  {
    id: 'rule_xmrig_process',
    name: 'XMRig crypto miner',
    source: 'builtin',
    confidence: 0.98,
    match: { type: 'process', keywords: ['xmrig','cpuminer','minergate','minerd','kworkerds'] },
    severity: 'critical',
    action: ['kill_process', 'alert'],
    learned_at: '2024-01-01T00:00:00Z',
    hit_count: 0
  },
  {
    id: 'rule_ssh_bruteforce',
    name: 'SSH brute force',
    source: 'builtin',
    confidence: 0.95,
    match: { type: 'auth_failures', threshold: 5, window_sec: 60 },
    severity: 'high',
    action: ['block_ip', 'alert'],
    learned_at: '2024-01-01T00:00:00Z',
    hit_count: 0
  },
  {
    id: 'rule_suspicious_ports',
    name: 'Known backdoor ports',
    source: 'builtin',
    confidence: 0.90,
    match: { type: 'port_open', ports: [4444,4445,1337,31337,6666,12345,54321] },
    severity: 'high',
    action: ['close_port', 'block_ip', 'alert'],
    learned_at: '2024-01-01T00:00:00Z',
    hit_count: 0
  },
  {
    id: 'rule_cron_wget_curl',
    name: 'Cron downloading scripts',
    source: 'builtin',
    confidence: 0.92,
    match: { type: 'cron_content', keywords: ['curl','wget','bash -i','nc -e','python -c','base64 -d'] },
    severity: 'critical',
    action: ['quarantine_cron', 'alert'],
    learned_at: '2024-01-01T00:00:00Z',
    hit_count: 0
  }
];

// ── Main Class ────────────────────────────────────────────────────────────────

class SelfLearner {
  constructor(config) {
    this.config  = config;
    this.openai  = new OpenAI({ apiKey: config.openai_key });
    this.rules   = this._loadRules();
    this.memory  = loadJSON(MEMORY_FILE, { events: [], ip_scores: {}, process_scores: {} });
    this.unsureQ = loadJSON(UNSURE_QUEUE, []);
    this._gptCallsToday = 0;
    this._lastGptReset  = new Date().toDateString();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Har naye event ko yahan bhejo.
   * Returns: { matched: bool, rule, verdict, action[] }
   */
  async evaluate(event) {
    this._resetGptCounterIfNewDay();

    // Step 1: Known rules se match karo
    const match = this._matchKnownRules(event);
    if (match) {
      match.hit_count = (match.hit_count || 0) + 1;
      this._saveRules();
      appendLog(`KNOWN rule hit: "${match.name}" on event type=${event.type}`);
      return { matched: true, rule: match, verdict: 'known_threat', actions: match.action };
    }

    // Step 2: Memory mein pattern hai?
    const memVerdict = this._checkMemoryPattern(event);
    if (memVerdict) {
      return { matched: true, rule: memVerdict, verdict: 'memory_pattern', actions: memVerdict.action };
    }

    // Step 3: Nahi jaanta — GPT se pooch (rate limit ke saath)
    if (this._canCallGPT()) {
      appendLog(`UNKNOWN event — consulting GPT: type=${event.type}`);
      const learned = await this._consultGPT(event);
      if (learned) {
        return { matched: true, rule: learned, verdict: 'gpt_learned', actions: learned.action };
      }
    } else {
      // GPT limit reached — queue mein rakh
      this._queueForLater(event);
      appendLog(`GPT daily limit reached, queued event: ${event.type}`);
    }

    // Step 4: Pata nahi, but suspicious record karo
    this._recordMemory(event, 'unknown');
    return { matched: false, verdict: 'unknown', actions: ['log'] };
  }

  /**
   * Raat ko internet se naye attack patterns fetch karo (NVD/CISA/AlienVault)
   */
  async fetchAndLearnThreatIntel() {
    appendLog('Fetching fresh threat intel from internet...');
    
    const ThreatIntel = require('./ThreatIntel');
    const intel = new ThreatIntel(this.config);
    const newPatterns = await intel.fetchAll();

    let added = 0;
    for (const pattern of newPatterns) {
      if (!this._ruleExists(pattern.id)) {
        this.rules.push({ ...pattern, source: 'threat_intel', hit_count: 0 });
        added++;
        appendLog(`NEW rule from intel: "${pattern.name}" (${pattern.source_url || 'unknown'})`);
      }
    }

    this._saveRules();
    appendLog(`Threat intel update complete. ${added} new rules added. Total: ${this.rules.length}`);
    return { added, total: this.rules.length };
  }

  async _fetchThreatIntel() {
    // Placeholder for actual threat intel APIs
    // In production: fetch from NVD, CISA, AlienVault OTX
    return [];
  }

  /**
   * Unsure queue process karo (jab GPT limit reset ho)
   */
  async processUnsureQueue() {
    if (this.unsureQ.length === 0) return;
    appendLog(`Processing ${this.unsureQ.length} queued events...`);
    const toProcess = [...this.unsureQ];
    this.unsureQ = [];
    saveJSON(UNSURE_QUEUE, []);

    for (const event of toProcess) {
      if (this._canCallGPT()) {
        await this._consultGPT(event);
      }
    }
  }

  /**
   * Weekly self-audit: GPT se purana rules review karwao
   */
  async selfAudit() {
    appendLog('Starting weekly self-audit of learned rules...');
    const oldRules = this.rules.filter(r => r.source !== 'builtin');
    if (oldRules.length === 0) return;

    const prompt = `You are a cybersecurity expert auditing security rules.
Review these learned rules and tell me:
1. Which are still valid in ${new Date().getFullYear()}?
2. Which are outdated or too aggressive (false positives)?
3. What improvements do you suggest?

Rules to audit:
${JSON.stringify(oldRules.slice(0, 30), null, 2)}

Respond in JSON: { "keep": [id,...], "remove": [id,...], "modify": [{id, changes},...], "notes": "..." }`;

    try {
      const res = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });
      const audit = JSON.parse(res.choices[0].message.content);

      // Remove outdated
      if (audit.remove?.length) {
        this.rules = this.rules.filter(r => !audit.remove.includes(r.id));
        appendLog(`Self-audit removed ${audit.remove.length} outdated rules`);
      }

      // Modify
      if (audit.modify?.length) {
        audit.modify.forEach(m => {
          const rule = this.rules.find(r => r.id === m.id);
          if (rule) Object.assign(rule, m.changes);
        });
        appendLog(`Self-audit updated ${audit.modify.length} rules`);
      }

      this._saveRules();
      appendLog(`Self-audit complete. Notes: ${audit.notes}`);
      return audit;
    } catch (err) {
      appendLog(`Self-audit GPT error: ${err.message}`);
    }
  }

  getRules()  { return this.rules; }
  getStats()  {
    return {
      total_rules:   this.rules.length,
      builtin:       this.rules.filter(r => r.source === 'builtin').length,
      gpt_learned:   this.rules.filter(r => r.source === 'gpt').length,
      intel_learned: this.rules.filter(r => r.source === 'threat_intel').length,
      gpt_calls_today: this._gptCallsToday,
      memory_events: this.memory.events.length
    };
  }

  // ── Private methods ────────────────────────────────────────────────────────

  _loadRules() {
    const stored = loadJSON(RULES_FILE, null);
    if (!stored) {
      saveJSON(RULES_FILE, SEED_RULES);
      return [...SEED_RULES];
    }
    // Merge: seed rules jo stored mein nahi hain
    const ids = new Set(stored.map(r => r.id));
    const merged = [...stored];
    for (const seed of SEED_RULES) {
      if (!ids.has(seed.id)) merged.push(seed);
    }
    return merged;
  }

  _saveRules() { saveJSON(RULES_FILE, this.rules); }

  _ruleExists(id) { return this.rules.some(r => r.id === id); }

  _matchKnownRules(event) {
    for (const rule of this.rules) {
      if (this._ruleMatchesEvent(rule, event)) return rule;
    }
    return null;
  }

  _ruleMatchesEvent(rule, event) {
    const m = rule.match;
    if (!m) return false;

    if (m.type === 'process' && event.type === 'process') {
      const name = (event.process_name || '').toLowerCase();
      const cmd  = (event.command || '').toLowerCase();
      return m.keywords?.some(k => name.includes(k) || cmd.includes(k));
    }

    if (m.type === 'auth_failures' && event.type === 'auth_failures') {
      return (event.count || 0) >= (m.threshold || 5);
    }

    if (m.type === 'port_open' && event.type === 'port_open') {
      return m.ports?.includes(event.port);
    }

    if (m.type === 'cron_content' && event.type === 'cron_content') {
      const content = (event.content || '').toLowerCase();
      return m.keywords?.some(k => content.includes(k));
    }

    if (m.type === 'network' && event.type === 'network') {
      if (m.ports  && m.ports.includes(event.remote_port)) return true;
      if (m.ip_pattern && new RegExp(m.ip_pattern).test(event.remote_ip)) return true;
      if (m.user_agent_keywords) {
        const ua = (event.user_agent || '').toLowerCase();
        return m.user_agent_keywords.some(k => ua.includes(k));
      }
    }

    if (m.type === 'file_hash' && event.type === 'file_hash') {
      return m.hashes?.includes(event.hash);
    }

    if (m.type === 'regex' && event.raw_text) {
      try { return new RegExp(m.pattern, 'i').test(event.raw_text); }
      catch { return false; }
    }

    return false;
  }

  _checkMemoryPattern(event) {
    // IP score check
    if (event.ip && this.memory.ip_scores[event.ip]) {
      const score = this.memory.ip_scores[event.ip];
      if (score >= 3) {
        return {
          id: 'memory_ip_' + event.ip,
          name: `Repeat offender IP: ${event.ip}`,
          source: 'memory',
          confidence: Math.min(0.5 + score * 0.1, 0.95),
          severity: score >= 5 ? 'high' : 'medium',
          action: ['block_ip', 'alert']
        };
      }
    }
    return null;
  }

  _recordMemory(event, verdict) {
    this.memory.events.push({ event, verdict, ts: Date.now() });
    if (this.memory.events.length > 1000) this.memory.events.shift();

    if (event.ip) {
      this.memory.ip_scores[event.ip] = (this.memory.ip_scores[event.ip] || 0) + 1;
    }
    saveJSON(MEMORY_FILE, this.memory);
  }

  _canCallGPT() {
    const MAX_PER_DAY = this.config.gpt_daily_limit || 100;
    return this.config.openai_key && this._gptCallsToday < MAX_PER_DAY;
  }

  _resetGptCounterIfNewDay() {
    const today = new Date().toDateString();
    if (today !== this._lastGptReset) {
      this._gptCallsToday = 0;
      this._lastGptReset  = today;
    }
  }

  _queueForLater(event) {
    this.unsureQ.push({ event, queued_at: new Date().toISOString() });
    if (this.unsureQ.length > 200) this.unsureQ.shift();
    saveJSON(UNSURE_QUEUE, this.unsureQ);
  }

  async _consultGPT(event) {
    this._gptCallsToday++;

    // Build rich context
    const recentEvents = this.memory.events.slice(-10).map(e => e.event);
    const prompt = `You are G1, an AI security guardian analyzing a suspicious server event.

=== SUSPICIOUS EVENT ===
${JSON.stringify(event, null, 2)}

=== RECENT SERVER EVENTS (context) ===
${JSON.stringify(recentEvents, null, 2)}

=== YOUR TASK ===
1. Is this a real security threat? What type?
2. What is the attacker trying to do?
3. How confident are you? (0.0 - 1.0)
4. What detection pattern should I add to catch this automatically in future?
5. What action should be taken?

Respond ONLY in this exact JSON format:
{
  "is_threat": true/false,
  "attack_name": "human readable name",
  "attack_type": "one of: crypto_mining|brute_force|backdoor|malware|ddos|data_exfil|privilege_escalation|persistence|scan|unknown",
  "confidence": 0.0-1.0,
  "severity": "low|medium|high|critical",
  "explanation": "2-3 sentences what is happening",
  "actions": ["kill_process"|"block_ip"|"alert"|"quarantine_file"|"log"],
  "new_rule": {
    "match_type": "process|auth_failures|port_open|cron_content|network|file_hash|regex",
    "match_details": { ...specific fields for match_type... },
    "description": "what this rule detects"
  },
  "false_positive_risk": "low|medium|high"
}`;

    try {
      const res = await this.openai.chat.completions.create({
        model:           'gpt-4o-mini',
        messages:        [{ role: 'user', content: prompt }],
        temperature:     0.15,
        max_tokens:      700,
        response_format: { type: 'json_object' }
      });

      const gpt = JSON.parse(res.choices[0].message.content);
      appendLog(`GPT verdict: ${gpt.attack_name} | confidence=${gpt.confidence} | threat=${gpt.is_threat}`);

      if (!gpt.is_threat) {
        // False alarm — remember it
        this._recordMemory(event, 'false_positive');
        return null;
      }

      // High confidence + low false positive risk = save as permanent rule
      if (gpt.confidence >= 0.75 && gpt.false_positive_risk !== 'high' && gpt.new_rule) {
        const newRule = this._buildRuleFromGPT(gpt, event);
        if (newRule && !this._ruleExists(newRule.id)) {
          this.rules.push(newRule);
          this._saveRules();
          appendLog(`LEARNED NEW RULE: "${newRule.name}" (confidence=${gpt.confidence})`);
        }
        return newRule;
      } else {
        // Low confidence — record in memory only, don't make permanent rule yet
        this._recordMemory(event, 'gpt_uncertain');
        appendLog(`GPT uncertain (confidence=${gpt.confidence}), not making permanent rule yet`);
        return {
          id: 'gpt_temp_' + Date.now(),
          name: gpt.attack_name,
          source: 'gpt_temp',
          confidence: gpt.confidence,
          severity: gpt.severity,
          action: gpt.actions,
          explanation: gpt.explanation
        };
      }

    } catch (err) {
      appendLog(`GPT consultation error: ${err.message}`);
      return null;
    }
  }

  _buildRuleFromGPT(gpt, event) {
    const nr = gpt.new_rule;
    const ruleId = `rule_gpt_${nr.match_type}_${Date.now()}`;

    const matchObj = { type: nr.match_type };

    // match_details ko properly set karo based on type
    if (nr.match_type === 'process') {
      matchObj.keywords = nr.match_details?.keywords
        || (event.process_name ? [event.process_name.toLowerCase()] : []);
    } else if (nr.match_type === 'auth_failures') {
      matchObj.threshold = nr.match_details?.threshold || 5;
      matchObj.window_sec = nr.match_details?.window_sec || 60;
    } else if (nr.match_type === 'port_open') {
      matchObj.ports = nr.match_details?.ports || (event.port ? [event.port] : []);
    } else if (nr.match_type === 'network') {
      matchObj.ports            = nr.match_details?.ports;
      matchObj.ip_pattern       = nr.match_details?.ip_pattern;
      matchObj.user_agent_keywords = nr.match_details?.user_agent_keywords;
    } else if (nr.match_type === 'regex') {
      matchObj.pattern = nr.match_details?.pattern || '';
    } else if (nr.match_type === 'file_hash') {
      matchObj.hashes = nr.match_details?.hashes || [];
    } else if (nr.match_type === 'cron_content') {
      matchObj.keywords = nr.match_details?.keywords || [];
    } else {
      Object.assign(matchObj, nr.match_details || {});
    }

    return {
      id:           ruleId,
      name:         gpt.attack_name,
      description:  nr.description || gpt.explanation,
      source:       'gpt',
      confidence:   gpt.confidence,
      match:        matchObj,
      severity:     gpt.severity,
      action:       gpt.actions || ['alert'],
      learned_at:   new Date().toISOString(),
      learned_from: event.type,
      hit_count:    0,
      false_positive_risk: gpt.false_positive_risk
    };
  }
}

module.exports = SelfLearner;
