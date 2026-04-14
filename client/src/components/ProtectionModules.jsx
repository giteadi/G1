import { useState, useEffect } from 'react'
import { Pickaxe, Lock, Shield, Search, Bot, Zap, Check, Loader2 } from 'lucide-react'
import api from '../services/api'

const ModuleCard = ({ icon: Icon, title, subtitle, features, active, color, onToggle }) => (
  <div className={`bg-gray-800/50 rounded-lg p-4 border ${
    active ? `border-${color}-500/30` : 'border-gray-700/50'
  } transition-all hover:border-gray-600`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg bg-${color}-500/20`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <button
        onClick={onToggle}
        className={`text-xs px-2 py-1 rounded-full transition-colors ${
          active 
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        {active ? (
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Active
          </span>
        ) : (
          'Disabled'
        )}
      </button>
    </div>
    <h4 className="font-medium text-sm mb-1">{title}</h4>
    <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
    <div className="flex flex-wrap gap-1">
      {features.map((feature, index) => (
        <span key={index} className="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-400">
          {feature}
        </span>
      ))}
    </div>
  </div>
)

const ProtectionModules = ({ detailed = false }) => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)

  const modules = [
    { 
      icon: Pickaxe, 
      title: 'Crypto Miner', 
      subtitle: 'CPU spike detection',
      features: ['process kill', 'hash detection'],
      key: 'auto_kill',
      color: 'amber'
    },
    { 
      icon: Lock, 
      title: 'Brute Force', 
      subtitle: 'Login watcher',
      features: ['login signature', 'IP auto-ban'],
      key: 'auto_block',
      color: 'amber'
    },
    { 
      icon: Zap, 
      title: 'DDoS Guard', 
      subtitle: 'Traffic analysis',
      features: ['rate limiting', 'packet filter'],
      key: 'ddos_guard',
      color: 'amber'
    },
    { 
      icon: Search, 
      title: 'Malware Scan', 
      subtitle: 'File signature',
      features: ['rootkit detect', 'quarantine'],
      key: 'malware_scan',
      color: 'amber'
    },
    { 
      icon: Bot, 
      title: 'Phishing/Bot', 
      subtitle: 'Domain block',
      features: ['bot fingerprint', 'URL check'],
      key: 'phishing_guard',
      color: 'amber'
    },
  ]

  useEffect(() => {
    const fetchStatus = async () => {
      const result = await api.fetchMetrics()
      if (result) {
        // Get config from status endpoint
        const statusRes = await fetch('http://localhost:3000/api/status')
        const statusData = await statusRes.json()
        if (statusData.config) {
          setConfig(statusData.config)
        }
      }
    }
    fetchStatus()
  }, [])

  const toggleModule = async (key) => {
    setLoading(true)
    // Toggle would be implemented here - for now just UI toggle
    setConfig(prev => ({ ...prev, [key]: !prev?.[key] }))
    setLoading(false)
  }

  const activeCount = modules.filter(m => config?.[m.key] !== false).length

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold">Protection Modules</h3>
            <p className="text-xs text-gray-500">G1 AI Brain — GPT-4o powered reasoning</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Zap className="w-4 h-4" />
          <span>{activeCount}/{modules.length} Active</span>
        </div>
      </div>

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Updating configuration...
        </div>
      )}

      <div className={`grid gap-3 ${detailed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5'}`}>
        {modules.map((module, index) => (
          <ModuleCard 
            key={index} 
            {...module} 
            active={config?.[module.key] !== false}
            onToggle={() => toggleModule(module.key)}
          />
        ))}
      </div>

      <div className="mt-4 bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-emerald-400">Auto Response</span>
        </div>
        <p className="text-xs text-gray-400">
          Instant action — no human needed • Block IP • Kill process • Quarantine file • Alert email • Log entry
        </p>
      </div>
    </div>
  )
}

export default ProtectionModules
