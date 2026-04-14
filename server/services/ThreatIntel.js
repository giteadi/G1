'use strict';

/**
 * ThreatIntel — G1 ka "newspaper" 
 * Roz raat ko yeh module:
 *  - NVD (National Vulnerability Database) se naye CVEs fetch karta hai
 *  - CISA Known Exploited Vulnerabilities dekh ta hai
 *  - AlienVault OTX se indicators of compromise leta hai
 *  - Abuse.ch se malware hashes aur C2 IPs leta hai
 *  - GPT se pucha jaata hai: "in CVEs se mujhe kya detect karna chahiye?"
 */

const https   = require('https');
const OpenAI  = require('openai');
const fs      = require('fs');
const path    = require('path');

const CACHE_FILE = path.join(process.env.HOME || '/root', '.g1', 'intel_cache.json');
const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 hours

function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

class ThreatIntel {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openai_key });
    this.cache  = this._loadCache();
  }

  async fetchAll() {
    const allPatterns = [];

    // Sources parallel mein fetch karo
    const results = await Promise.allSettled([
      this._fetchNVDRecent(),
      this._fetchCISAKEV(),
      this._fetchAbuseIPDB(),
      this._fetchMalwareBazaarHashes(),
    ]);

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.length) {
        allPatterns.push(...r.value);
      }
    }

    // Agar GPT key hai: CVEs ko actionable rules mein convert karo
    if (this.config.openai_key && allPatterns.length > 0) {
      const enriched = await this._enrichWithGPT(allPatterns);
      return enriched;
    }

    return allPatterns;
  }

  // ── NVD: Latest Linux/Server CVEs ─────────────────────────────────────────
  async _fetchNVDRecent() {
    const cacheKey = 'nvd_recent';
    if (this._isCacheFresh(cacheKey)) return this.cache[cacheKey];

    try {
      const endDate   = new Date().toISOString().split('T')[0] + 'T23:59:59.000';
      const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] + 'T00:00:00.000';
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${startDate}&pubEndDate=${endDate}&keywordSearch=linux+server+ssh+apache+nginx&resultsPerPage=20`;

      const data = await httpsGet(url);
      const rules = [];

      for (const item of data?.vulnerabilities || []) {
        const cve  = item.cve;
        const desc = cve?.descriptions?.find(d => d.lang === 'en')?.value || '';
        const cvss = cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 0;

        if (cvss >= 7.0) {  // High/Critical only
          rules.push({
            id:         `intel_nvd_${cve.id}`,
            name:       `${cve.id}: ${desc.substring(0, 60)}...`,
            source:     'nvd',
            source_url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
            cvss_score: cvss,
            raw_desc:   desc,
            match:      null,   // GPT fill karega
            severity:   cvss >= 9 ? 'critical' : 'high',
            action:     ['alert'],
            needs_enrichment: true,
            learned_at: new Date().toISOString(),
            hit_count:  0
          });
        }
      }

      this._setCache(cacheKey, rules);
      return rules;
    } catch (err) {
      console.log('[ThreatIntel] NVD fetch failed:', err.message);
      return [];
    }
  }

  // ── CISA: Known Exploited Vulnerabilities ─────────────────────────────────
  async _fetchCISAKEV() {
    const cacheKey = 'cisa_kev';
    if (this._isCacheFresh(cacheKey)) return this.cache[cacheKey];

    try {
      const data = await httpsGet('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
      const recent = (data?.vulnerabilities || [])
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 15);

      const rules = recent.map(v => ({
        id:               `intel_cisa_${v.cveID}`,
        name:             `CISA KEV: ${v.vulnerabilityName}`,
        source:           'cisa_kev',
        source_url:       'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        product:          v.product,
        vendor:           v.vendorProject,
        raw_desc:         v.shortDescription,
        required_action:  v.requiredAction,
        match:            null,
        severity:         'critical',   // CISA KEV = actively exploited
        action:           ['alert', 'patch_required'],
        needs_enrichment: true,
        learned_at:       new Date().toISOString(),
        hit_count:        0
      }));

      this._setCache(cacheKey, rules);
      return rules;
    } catch (err) {
      console.log('[ThreatIntel] CISA fetch failed:', err.message);
      return [];
    }
  }

  // ── AbuseIPDB: Fresh malicious IPs ────────────────────────────────────────
  async _fetchAbuseIPDB() {
    // AbuseIPDB blacklist (free tier, no key needed for basic)
    const cacheKey = 'abuseipdb';
    if (this._isCacheFresh(cacheKey)) return this.cache[cacheKey];

    try {
      // AlienVault OTX pulses (free, no auth for recent public)
      const data = await httpsGet('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10', {
        headers: { 'User-Agent': 'G1-Guardian/1.0' }
      });

      const ipRules = [];
      for (const pulse of data?.results || []) {
        for (const indicator of pulse.indicators || []) {
          if (indicator.type === 'IPv4' && indicator.indicator) {
            ipRules.push({
              id:       `intel_otx_${indicator.indicator.replace(/\./g, '_')}`,
              name:     `Malicious IP: ${indicator.indicator} (${pulse.name})`,
              source:   'alienvault_otx',
              match:    { type: 'network', ip_pattern: indicator.indicator.replace(/\./g, '\\.') },
              severity: 'high',
              action:   ['block_ip', 'alert'],
              needs_enrichment: false,
              learned_at: new Date().toISOString(),
              hit_count: 0
            });
          }
        }
      }

      this._setCache(cacheKey, ipRules.slice(0, 50));
      return ipRules.slice(0, 50);
    } catch (err) {
      console.log('[ThreatIntel] OTX fetch failed:', err.message);
      return [];
    }
  }

  // ── MalwareBazaar: Fresh malware hashes ───────────────────────────────────
  async _fetchMalwareBazaarHashes() {
    const cacheKey = 'malware_bazaar';
    if (this._isCacheFresh(cacheKey)) return this.cache[cacheKey];

    try {
      const data = await httpsGet('https://mb-api.abuse.ch/api/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // abuse.ch recent linux samples
      const resp = await new Promise((resolve, reject) => {
        const https = require('https');
        const postData = 'query=get_recent&selector=100';
        const options = {
          hostname: 'mb-api.abuse.ch',
          path: '/api/v1/',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData.length }
        };
        const req = https.request(options, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => req.destroy());
        req.write(postData);
        req.end();
      });

      const hashRules = (resp?.data || [])
        .filter(s => s.file_type_mime?.includes('elf') || s.tags?.includes('linux'))
        .slice(0, 30)
        .map(s => ({
          id:       `intel_malbaz_${s.sha256_hash?.slice(0, 16)}`,
          name:     `Malware: ${s.file_name || s.sha256_hash?.slice(0, 16)} (${s.signature || 'unknown'})`,
          source:   'malware_bazaar',
          match:    { type: 'file_hash', hashes: [s.sha256_hash, s.md5_hash].filter(Boolean) },
          severity: 'critical',
          action:   ['quarantine_file', 'kill_process', 'alert'],
          needs_enrichment: false,
          learned_at: new Date().toISOString(),
          hit_count: 0
        }));

      this._setCache(cacheKey, hashRules);
      return hashRules;
    } catch (err) {
      console.log('[ThreatIntel] MalwareBazaar fetch failed:', err.message);
      return [];
    }
  }

  // ── GPT: CVE descriptions ko detection rules mein badlo ──────────────────
  async _enrichWithGPT(rawPatterns) {
    const needsEnrichment = rawPatterns.filter(p => p.needs_enrichment);
    const alreadyReady    = rawPatterns.filter(p => !p.needs_enrichment);

    if (needsEnrichment.length === 0) return rawPatterns;

    // Batch mein bhejo (max 10 at a time)
    const batches = [];
    for (let i = 0; i < needsEnrichment.length; i += 10) {
      batches.push(needsEnrichment.slice(i, i + 10));
    }

    const enriched = [];
    for (const batch of batches) {
      const prompt = `You are a security engineer converting vulnerability descriptions into runtime detection rules.

For each vulnerability below, create a practical Linux server detection rule.
Focus on what you can actually detect: suspicious processes, network connections, file changes, command patterns.

Vulnerabilities:
${batch.map((v, i) => `${i+1}. [${v.id}] ${v.name}
   Description: ${v.raw_desc || v.name}
   Product: ${v.product || 'unknown'}`).join('\n\n')}

For each, respond with JSON array:
[
  {
    "original_id": "intel_nvd_CVE-...",
    "detectable": true/false,
    "match_type": "process|network|cron_content|file_hash|regex|port_open",
    "match_details": { ...appropriate fields... },
    "detection_note": "what exactly we are detecting"
  }
]
Only include rules where detectable=true and you have specific match criteria.`;

      try {
        const res = await this.openai.chat.completions.create({
          model:           'gpt-4o-mini',
          messages:        [{ role: 'user', content: prompt }],
          temperature:     0.1,
          max_tokens:      1200,
          response_format: { type: 'json_object' }
        });

        const parsed = JSON.parse(res.choices[0].message.content);
        const gptRules = Array.isArray(parsed) ? parsed : (parsed.rules || []);

        for (const gr of gptRules) {
          if (!gr.detectable) continue;
          const original = batch.find(b => b.id === gr.original_id);
          if (!original) continue;
          enriched.push({
            ...original,
            match: { type: gr.match_type, ...gr.match_details },
            detection_note: gr.detection_note,
            needs_enrichment: false
          });
        }
      } catch (err) {
        console.log('[ThreatIntel] GPT enrichment error:', err.message);
        // Keep without enrichment
        enriched.push(...batch.map(b => ({ ...b, needs_enrichment: false })));
      }
    }

    return [...enriched, ...alreadyReady];
  }

  // ── Cache helpers ──────────────────────────────────────────────────────────
  _loadCache() {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch { return {}; }
  }
  _isCacheFresh(key) {
    const entry = this.cache[key];
    return entry?.data && (Date.now() - entry.ts) < CACHE_TTL;
  }
  _setCache(key, data) {
    this.cache[key] = { data, ts: Date.now() };
    try { fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache)); } catch {}
  }
}

module.exports = ThreatIntel;
