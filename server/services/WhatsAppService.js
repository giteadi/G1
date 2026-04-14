'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor(config) {
    this.config = config;
    this.enabled = !!(config.whatsapp_api_url && config.whatsapp_phone);
  }

  async sendThreatAlert(threat) {
    if (!this.enabled) {
      logger.info('WhatsApp notifications disabled - no config');
      return false;
    }

    try {
      const message = this.formatThreatMessage(threat);
      
      // Using WhatsApp Business API or services like Twilio, MessageBird, etc.
      const response = await axios.post(this.config.whatsapp_api_url, {
        phone: this.config.whatsapp_phone,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.whatsapp_api_key || ''}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      logger.info(`WhatsApp alert sent for threat: ${threat.type}`);
      return true;
    } catch (e) {
      logger.error(`WhatsApp notification failed: ${e.message}`);
      return false;
    }
  }

  formatThreatMessage(threat) {
    const emoji = this.getSeverityEmoji(threat.severity);
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    let message = `${emoji} *G1 Security Alert*\n\n`;
    message += `🔴 *Threat Type:* ${threat.type}\n`;
    message += `⚠️ *Severity:* ${threat.severity?.toUpperCase()}\n`;
    message += `📝 *Message:* ${threat.message}\n`;
    message += `🕐 *Time:* ${timestamp}\n`;
    
    if (threat.source_ip) {
      message += `🌐 *Source IP:* ${threat.source_ip}\n`;
    }
    
    if (threat.process_name) {
      message += `⚙️ *Process:* ${threat.process_name} (PID: ${threat.pid})\n`;
    }
    
    if (threat.findings && threat.findings.length > 0) {
      message += `\n📋 *Findings:*\n`;
      threat.findings.slice(0, 3).forEach(f => {
        message += `• ${f}\n`;
      });
      if (threat.findings.length > 3) {
        message += `... and ${threat.findings.length - 3} more\n`;
      }
    }
    
    if (threat.ai_analysis) {
      message += `\n🤖 *AI Analysis:*\n${threat.ai_analysis.substring(0, 200)}...\n`;
    }
    
    message += `\n🛡️ *Source:* ${threat.source === 'auto_scan' ? 'Auto Detection' : 'Manual Scan'}`;
    message += `\n\n_G1 Guardian - Always Protecting_`;
    
    return message;
  }

  getSeverityEmoji(severity) {
    switch(severity?.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  }

  async sendScanSummary(summary) {
    if (!this.enabled) return false;

    try {
      const message = `📊 *G1 Scan Summary*\n\n` +
        `✅ Clean: ${summary.clean}\n` +
        `⚠️ Warnings: ${summary.warnings}\n` +
        `🔴 Threats: ${summary.threats}\n` +
        `📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `_Scan Type: ${summary.scan_type}_`;

      await axios.post(this.config.whatsapp_api_url, {
        phone: this.config.whatsapp_phone,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.whatsapp_api_key || ''}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return true;
    } catch (e) {
      logger.error(`WhatsApp scan summary failed: ${e.message}`);
      return false;
    }
  }
}

module.exports = WhatsAppService;
