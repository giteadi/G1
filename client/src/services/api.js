const API_BASE = 'http://localhost:3000/api';

class G1Api {
  async fetchMetrics() {
    try {
      const res = await fetch(`${API_BASE}/status/metrics`);
      return await res.json();
    } catch (e) {
      console.error('Metrics fetch failed:', e);
      return null;
    }
  }

  async fetchThreats() {
    try {
      const res = await fetch(`${API_BASE}/threats`);
      return await res.json();
    } catch (e) {
      console.error('Threats fetch failed:', e);
      return null;
    }
  }

  async fetchLearningStats() {
    try {
      const res = await fetch(`${API_BASE}/learning/stats`);
      return await res.json();
    } catch (e) {
      console.error('Learning stats fetch failed:', e);
      return null;
    }
  }

  async fetchLearningRules() {
    try {
      const res = await fetch(`${API_BASE}/learning/rules`);
      return await res.json();
    } catch (e) {
      console.error('Learning rules fetch failed:', e);
      return null;
    }
  }

  async chat(message) {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      return await res.json();
    } catch (e) {
      console.error('Chat failed:', e);
      return { success: false, error: e.message };
    }
  }

  async runScan() {
    try {
      const res = await fetch(`${API_BASE}/threats/scan`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('Scan failed:', e);
      return { success: false, error: e.message };
    }
  }

  async blockIP(ip) {
    try {
      const res = await fetch(`${API_BASE}/threats/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      return await res.json();
    } catch (e) {
      console.error('Block IP failed:', e);
      return { success: false, error: e.message };
    }
  }

  async cleanThreats() {
    try {
      const res = await fetch(`${API_BASE}/threats/clean`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('Clean failed:', e);
      return { success: false, error: e.message };
    }
  }

  async whitelistIP(ip) {
    try {
      const res = await fetch(`${API_BASE}/threats/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      return await res.json();
    } catch (e) {
      console.error('Whitelist failed:', e);
      return { success: false, error: e.message };
    }
  }

  async selfAudit() {
    try {
      const res = await fetch(`${API_BASE}/learning/self-audit`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.error('Self audit failed:', e);
      return { success: false, error: e.message };
    }
  }
}

export default new G1Api();
