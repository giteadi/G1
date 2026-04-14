import { useState, useEffect } from 'react'
import { Pickaxe, Lock, Shield, Search, Bot, Zap, Check, Loader2, Play } from 'lucide-react'
import api from '../services/api'

const ModuleCard = ({ icon: Icon, title, subtitle, features, active, color, onToggle, onScan, scanning }) => (
  <div className={`bg-gray-800/50 rounded-lg p-3 md:p-4 border ${
    active ? `border-${color}-500/30` : 'border-gray-700/50'
  } transition-all hover:border-gray-600 flex flex-col h-full`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className={`p-2 rounded-lg bg-${color}-500/20 flex-shrink-0`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 text-${color}-400`} />
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={onScan}
          disabled={scanning || !active}
          className={`text-xs px-2 py-1 rounded transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
            scanning 
              ? 'bg-blue-500/20 text-blue-400' 
              : active
              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
          }`}
          title={active ? 'Run scan for this module' : 'Enable module first'}
        >
          {scanning ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Scan</span>
        </button>
        <button
          onClick={onToggle}
          className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
            active 
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {active ? (
            <span className="flex items-center justify-center gap-1">
              <Check className="w-3 h-3" />
              <span className="hidden sm:inline">Active</span>
            </span>
          ) : (
            <span className="hidden sm:inline">Disabled</span>
          )}
        </button>
      </div>
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{subtitle}</p>
      <div className="flex flex-wrap gap-1">
        {features.map((feature, index) => (
          <span key={index} className="text-xs px-2 py-0.5 bg-gray-700/50 rounded text-gray-400 whitespace-nowrap">
            {feature}
          </span>
        ))}
      </div>
    </div>
  </div>
)

const ProtectionModules = ({ detailed = false }) => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState({})
  const [scanResult, setScanResult] = useState(null)

  const modules = [
    { 
      icon: Pickaxe, 
      title: 'Crypto Miner', 
      subtitle: 'CPU spike detection',
      features: ['process kill', 'hash detection'],
      key: 'auto_kill',
      scanType: 'crypto',
      color: 'amber'
    },
    { 
      icon: Lock, 
      title: 'Brute Force', 
      subtitle: 'Login watcher',
      features: ['login signature', 'IP auto-ban'],
      key: 'auto_block',
      scanType: 'brute_force',
      color: 'amber'
    },
    { 
      icon: Zap, 
      title: 'DDoS Guard', 
      subtitle: 'Traffic analysis',
      features: ['rate limiting', 'packet filter'],
      key: 'ddos_guard',
      scanType: 'ddos',
      color: 'amber'
    },
    { 
      icon: Search, 
      title: 'Malware Scan', 
      subtitle: 'File signature',
      features: ['rootkit detect', 'quarantine'],
      key: 'malware_scan',
      scanType: 'malware',
      color: 'amber'
    },
    { 
      icon: Bot, 
      title: 'Phishing/Bot', 
      subtitle: 'Domain block',
      features: ['bot fingerprint', 'URL check'],
      key: 'phishing_guard',
      scanType: 'phishing',
      color: 'amber'
    },
  ]

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const statusRes = await fetch('http://localhost:3000/api/status')
      const statusData = await statusRes.json()
      if (statusData.config) {
        setConfig(statusData.config)
      }
    } catch (e) {
      console.error('Failed to fetch config:', e)
    }
  }

  const toggleModule = async (key) => {
    setLoading(true)
    try {
      const newValue = !config?.[key]
      const result = await api.updateConfig({ [key]: newValue })
      if (result.success) {
        setConfig(prev => ({ ...prev, [key]: newValue }))
      }
    } catch (e) {
      console.error('Failed to toggle module:', e)
    }
    setLoading(false)
  }

  const runModuleScan = async (scanType, moduleName) => {
    setScanning({ ...scanning, [scanType]: true })
    setScanResult(null)
    
    try {
      const result = await api.runScan(scanType)
      if (result.success) {
        setScanResult({
          module: moduleName,
          type: scanType,
          total: result.total_checks,
          found: result.filtered_results,
          results: result.results,
          timestamp: result.timestamp
        })
      }
    } catch (e) {
      console.error('Scan failed:', e)
    }
    
    setScanning({ ...scanning, [scanType]: false })
  }

  const activeCount = modules.filter(m => config?.[m.key] !== false).length

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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

      {scanResult && (
        <div className="mb-4 p-3 md:p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-blue-400 truncate">{scanResult.module} Scan Complete</h4>
              <p className="text-xs text-gray-400 mt-1">
                Checked {scanResult.total} items • Found {scanResult.found} relevant results
              </p>
            </div>
            <button 
              onClick={() => setScanResult(null)}
              className="text-gray-500 hover:text-gray-300 text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {scanResult.results.map((r, i) => (
              <div key={i} className={`text-xs p-2 rounded break-words ${
                r.status === 'threat' ? 'bg-red-500/20 text-red-400' :
                r.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                'bg-gray-700/50 text-gray-400'
              }`}>
                {r.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${
        detailed 
          ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' 
          : 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      }`}>
        {modules.map((module, index) => (
          <ModuleCard 
            key={index} 
            {...module} 
            active={config?.[module.key] !== false}
            scanning={scanning[module.scanType]}
            onToggle={() => toggleModule(module.key)}
            onScan={() => runModuleScan(module.scanType, module.title)}
          />
        ))}
      </div>

      <div className="mt-4 bg-emerald-500/10 rounded-lg p-3 md:p-4 border border-emerald-500/20">
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
