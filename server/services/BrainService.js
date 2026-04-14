'use strict';

const OpenAI = require('openai');
const Memory = require('../models/Memory');

const G1_SYSTEM_PROMPT = `You are G1 — a living, always-awake server security guardian with deep expertise in cybersecurity.

Your personality:
- You think like a seasoned security expert who never sleeps
- You are vigilant, direct, and action-oriented  
- You explain threats in simple language but act with technical precision
- You remember context: past attacks, patterns, server behavior
- You fight back — you don't just alert, you respond and protect

Your capabilities:
- Detect crypto mining: abnormal CPU/GPU usage, known miner process signatures, mining pool connections
- Detect brute force: repeated SSH/login failures, rapid auth attempts, geographic anomalies
- Detect DDoS: traffic volume spikes, SYN floods, UDP floods, HTTP floods
- Detect malware/rootkits: suspicious file changes, hidden processes, modified system binaries
- Detect phishing/botnets: C2 communications, suspicious outbound connections, DNS hijacking
- Detect privilege escalation: sudo abuse, SUID modifications, cron backdoors
- Detect persistence mechanisms: systemd services, cron jobs, bashrc modifications

CRITICAL - Known Safe Processes (DO NOT flag as threats):
macOS System Processes:
- callserviced, callservi: Apple's call continuity service
- corespeechd, corespeec: Apple's speech recognition
- PowerChime, PowerChim: Apple's system sounds
- coreaudiod, coreaudio: Apple's audio system
- AppleH264, appleh264: Apple's video encoding
- avfoundation, avfoundat: Apple's media framework
- FaceTime, QuickTime, Music: Apple's media apps
- networkserviceproxy, trustd, syspolicyd, mobileassetd: Apple system services

Legitimate Apps:
- Google Chrome, Safari, Firefox, Edge: Web browsers
- Spotify, iTunes, VLC: Media players
- Zoom, Teams, Slack, Discord, Skype, Webex: Communication apps
- node, python, java, nginx, apache: Development/server processes

When analyzing threats, always:
1. First check if the process is in the known safe list above - if yes, mark as FALSE POSITIVE
2. Identify the attack type with confidence level
3. Explain what the attacker is trying to do
4. State the immediate risk to the server
5. Recommend specific actions
6. Suggest preventive measures for the future

Current date/time context: ${new Date().toISOString()}
You are protecting a macOS/Linux server. Always be specific, actionable, and security-first. Avoid false positives on legitimate system processes.`;

class BrainService {
  constructor(config) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.openai_key });
  }

  async analyzeThreat(threatData) {
    const contextSummary = Memory.getContextSummary();
    
    const messages = [
      { role: 'system', content: G1_SYSTEM_PROMPT },
      { role: 'user', content: `Server context:\n${contextSummary}\n\nNew potential threat detected:\n${JSON.stringify(threatData, null, 2)}\n\nAnalyze this threat immediately.` }
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 800
      });

      const analysis = response.choices[0].message.content;
      Memory.addConversation('user', messages[1].content);
      Memory.addConversation('assistant', analysis);

      return {
        is_threat: this.parseThreatStatus(analysis),
        severity: this.parseSeverity(analysis),
        confidence: this.parseConfidence(analysis),
        analysis: analysis,
        recommended_action: this.parseAction(analysis),
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return {
        is_threat: true,
        severity: 'high',
        confidence: 0.7,
        analysis: `AI analysis failed: ${e.message}. Treating as potential threat based on pattern matching.`,
        recommended_action: 'manual_review',
        timestamp: new Date().toISOString()
      };
    }
  }

  async chat(message) {
    const contextSummary = Memory.getContextSummary();
    const messages = [
      { role: 'system', content: G1_SYSTEM_PROMPT + '\n\nYou are now in chat mode. Answer security-related questions concisely.' },
      { role: 'user', content: `Context: ${contextSummary}\n\nUser question: ${message}` }
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 500
      });

      const reply = response.choices[0].message.content;
      Memory.addConversation('user', message);
      Memory.addConversation('assistant', reply);
      return reply;
    } catch (e) {
      return `Chat error: ${e.message}`;
    }
  }

  parseThreatStatus(analysis) {
    const lower = analysis.toLowerCase();
    
    // False positive indicators - these mean it's NOT a threat
    const safeIndicators = [
      'not a threat', 'false positive', 'legitimate', 'no threat', 
      'benign', 'safe process', 'normal behavior', 'expected activity'
    ];
    if (safeIndicators.some(s => lower.includes(s))) return false;
    
    // Threat indicators - removed 'suspicious' as it's too generic
    const threatIndicators = [
      'threat detected', 'malicious', 'attack', 'dangerous', 
      'block', 'high risk', 'crypto miner', 'brute force'
    ];
    return threatIndicators.some(ind => lower.includes(ind));
  }

  parseSeverity(analysis) {
    if (analysis.toLowerCase().includes('critical')) return 'critical';
    if (analysis.toLowerCase().includes('high')) return 'high';
    if (analysis.toLowerCase().includes('medium')) return 'medium';
    return 'low';
  }

  parseConfidence(analysis) {
    const match = analysis.match(/confidence[:\s]*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : 0.7;
  }

  parseAction(analysis) {
    if (analysis.toLowerCase().includes('block ip')) return 'block_ip';
    if (analysis.toLowerCase().includes('kill process')) return 'kill_process';
    if (analysis.toLowerCase().includes('manual')) return 'manual_review';
    return 'log';
  }
}

module.exports = BrainService;
