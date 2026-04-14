# G1 Self-Learning Engine

Yeh G1 ka **dimag** hai jo waqt ke saath smarter hota jaata hai — bina kisi update ke.

## Kaise kaam karta hai

```
Naya event aaya
      │
      ▼
Known rules se match? ──YES──▶ Action lo, hit_count++
      │
      NO
      │
      ▼
Memory mein pattern? ──YES──▶ Suspicious mark karo
      │
      NO
      │
      ▼
GPT se pooch (full context) ──▶ Rule extract karo ──▶ rules.json mein save
      │
      ▼ (raat ko)
Internet se threat intel ──▶ NVD + CISA + OTX + MalwareBazaar
      │
      ▼ (weekly)
Self-audit: GPT purani rules review kare, galat hatao
```

## 4 Sources se seekhta hai

| Source | Kya milta hai | Frequency |
|--------|--------------|-----------|
| Live server events | Real attacks on YOUR server | Har 2 min |
| GPT-4o consultation | Unknown events ka analysis + rule | On-demand |
| NVD / CISA | New CVEs, actively exploited vulns | Har 6 ghante |
| AlienVault OTX + MalwareBazaar | Malicious IPs, malware hashes | Har 6 ghante |

## Install (G1 ke saath)

```bash
# G1 main package mein already included hai
# Daemon automatically start karta hai

# Ya manually:
node bin/learn.js status
node bin/learn.js update
node bin/learn.js audit
```

## Commands

```bash
# Status
node bin/learn.js status              # kitni rules hain, kya seekha

# Rules dekho
node bin/learn.js rules               # saari rules
node bin/learn.js rules gpt           # sirf GPT ne sikhaya
node bin/learn.js rules intel         # sirf internet se aaya

# Manually sikhao
node bin/learn.js teach '{"type":"process","process_name":"evil.sh","cpu":99}'

# Update
node bin/learn.js update              # abhi intel fetch karo
node bin/learn.js audit               # GPT se rules review karwao

# Cleanup
node bin/learn.js forget rule_gpt_1234  # ek rule hatao

# Logs
node bin/learn.js log                 # learning activity dekho
node bin/learn.js queue               # unsure events queue
```

## Files

```
~/.g1/
├── learned_rules.json     ← Saari rules (builtin + GPT + intel)
├── pattern_memory.json    ← IP scores, event history
├── learning_stats.json    ← Stats
├── unsure_queue.json      ← GPT limit hone par queue
├── intel_cache.json       ← Threat intel cache
└── learning.log           ← Kya seekha, kab seekha
```

## GPT Daily Limit

Default: 100 calls/day. Config mein change karo:
```bash
g1 config  # add: "gpt_daily_limit": 200
```

Limit hit hone par events queue mein jaate hain aur raat 3 baje process hote hain.

## Guaranteed Improvements Over Time

- Week 1: Sirf builtin rules (4 rules)
- Week 2: 20-50 GPT-learned rules from your server's attacks
- Month 1: 100+ rules including latest CVEs
- Month 3: Fully customized to YOUR server's attack patterns
