import { useState, useEffect } from 'react'
import { Settings, Save, Loader2, Bell, Shield, Clock, Mail, Database } from 'lucide-react'
import api from '../services/api'

const SettingsPanel = () => {
  const [config, setConfig] = useState({
    auto_block: true,
    auto_kill: false,
    monitor_interval: 30,
    scan_interval: 300,
    alert_email: '',
    log_level: 'info'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/status')
      const data = await res.json()
      if (data.config) {
        setConfig(prev => ({ ...prev, ...data.config }))
      }
    } catch (e) {
      console.error('Failed to fetch config:', e)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('http://localhost:3000/api/status/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
    setSaving(false)
  }

  const SettingItem = ({ icon: Icon, label, description, children }) => (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-gray-700 rounded-lg">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm">{label}</h4>
          </div>
          <p className="text-xs text-gray-500 mb-3">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold">System Settings</h3>
            <p className="text-xs text-gray-500">Configure G1 Guardian behavior</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <SettingItem
            icon={Shield}
            label="Auto Block"
            description="Automatically block IPs that show malicious behavior"
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_block}
                onChange={(e) => setConfig({ ...config, auto_block: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-300">
                {config.auto_block ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </SettingItem>

          <SettingItem
            icon={Database}
            label="Auto Kill Processes"
            description="Automatically kill suspicious processes (crypto miners, malware)"
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_kill}
                onChange={(e) => setConfig({ ...config, auto_kill: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-300">
                {config.auto_kill ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </SettingItem>

          <SettingItem
            icon={Clock}
            label="Monitor Interval"
            description="How often to check system metrics (in seconds)"
          >
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.monitor_interval}
                onChange={(e) => setConfig({ ...config, monitor_interval: parseInt(e.target.value) })}
                min="10"
                max="300"
                className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-sm text-gray-400">seconds</span>
            </div>
          </SettingItem>

          <SettingItem
            icon={Bell}
            label="Alert Email"
            description="Email address for security alerts (optional)"
          >
            <input
              type="email"
              value={config.alert_email || ''}
              onChange={(e) => setConfig({ ...config, alert_email: e.target.value })}
              placeholder="alerts@example.com"
              className="w-full max-w-md bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </SettingItem>

          <SettingItem
            icon={Database}
            label="Log Level"
            description="How much detail to log (debug, info, warn, error)"
          >
            <select
              value={config.log_level}
              onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
              className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </SettingItem>
        </div>
      )}
    </div>
  )
}

export default SettingsPanel
