import { useState, useEffect } from 'react'
import { Pickaxe, Lock, Shield, Search, Bot, Zap, Check, Loader2, Play, Eye, Globe, FileWarning, Network } from 'lucide-react'
import api from '../services/api'

const ResultRow = ({ result }) => {
  const [open, setOpen] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  const isThreat  = result.status === 'threat'
  const isWarning = result.status === 'warning'
  const isClean   = result.status === 'clean'

  const statusStyle = isThreat
    ? 'border-l-4 border-red-500 bg-red-500/5'
    : isWarning
    ? 'border-l-4 border-yellow-500 bg-yellow-500/5'
    : 'border-l-4 border-green-600 bg-gray-800/20'

  const statusLabel = isThreat
    ? <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">THREAT</span>
    : isWarning
    ? <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">WARNING</span>
    : <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">CLEAN</span>

  const autoFix = async () => {
    setFixing(true)
    try {
      const res = await fetch('http://localhost:3000/api/threats/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: result.module, force: true })
      })
      const data = await res.json()
      setFixResult(data.results?.[0]?.action || 'Cleanup initiated')
    } catch (e) {
      setFixResult('Fix failed: ' + e.message)
    }
    setFixing(false)
  }

  return (
    <div className={`${statusStyle} transition-all`}>
      
      {/* Row Header — click to expand */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {statusLabel}
          <span className="text-sm font-medium capitalize text-gray-200 truncate">
            {result.module?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">{result.message}</span>
          {(result.findings?.length > 0 || result.ai_analysis) && (
            <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {open && (
        <div className="px-4 pb-4 space-y-3">
          
          {/* Message — full */}
          <p className="text-xs text-gray-400">{result.message}</p>

          {/* Findings */}
          {result.findings?.length > 0 && (
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                Findings ({result.findings.length})
              </p>
              <ul className="space-y-1.5">
                {result.findings.map((f, fi) => (
                  <li key={fi} className="flex gap-2 text-xs">
                    <span className="text-gray-600 shrink-0 font-mono">{String(fi + 1).padStart(2, '0')}</span>
                    <span className="font-mono text-gray-300 break-all">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                AI Analysis
              </p>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {result.ai_analysis}
              </div>
            </div>
          )}

          {/* Fix Result */}
          {fixResult && (
            <div className="text-xs p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300">
              {fixResult}
            </div>
          )}

          {/* Action Buttons */}
          {(isThreat || isWarning) && !fixResult && (
            <div className="flex gap-2">
              <button
                onClick={autoFix}
                disabled={fixing}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
              >
                {fixing
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Fixing...</>
                  : <><Zap className="w-3 h-3" /> Auto Fix</>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ScanResultModal = ({ scanResult, onClose }) => {
  if (!scanResult) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800/80 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white">{scanResult.module} Scan Results</h3>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(scanResult.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {scanResult.summary && (
              <div className="flex gap-2 text-xs">
                {scanResult.summary.threats > 0 && (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded font-medium">
                    {scanResult.summary.threats} Threat{scanResult.summary.threats > 1 ? 's' : ''}
                  </span>
                )}
                {scanResult.summary.warnings > 0 && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded font-medium">
                    {scanResult.summary.warnings} Warning{scanResult.summary.warnings > 1 ? 's' : ''}
                  </span>
                )}
                {scanResult.summary.clean > 0 && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded font-medium">
                    {scanResult.summary.clean} Clean
                  </span>
                )}
              </div>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Results */}
        <div className="divide-y divide-gray-700/50 max-h-[calc(90vh-80px)] overflow-y-auto">
          {scanResult.results?.map((r, i) => (
            <ResultRow key={i} result={r} />
          ))}
        </div>

      </div>
    </div>
  )
}

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
      color: 'red'
    },
    { 
      icon: Zap, 
      title: 'DDoS Guard', 
      subtitle: 'Traffic analysis',
      features: ['rate limiting', 'packet filter'],
      key: 'ddos_guard',
      scanType: 'ddos',
      color: 'purple'
    },
    { 
      icon: Search, 
      title: 'Rootkit Scan', 
      subtitle: 'Deep system check',
      features: ['rootkit detect', 'hidden process'],
      key: 'malware_scan',
      scanType: 'rootkit',
      color: 'red'
    },
    { 
      icon: FileWarning, 
      title: 'Suspicious Crons', 
      subtitle: 'Scheduled task check',
      features: ['cron analysis', 'auto-remove'],
      key: 'cron_guard',
      scanType: 'crons',
      color: 'orange'
    },
    { 
      icon: Network, 
      title: 'Open Ports', 
      subtitle: 'Port monitoring',
      features: ['suspicious ports', 'auto-close'],
      key: 'port_guard',
      scanType: 'ports',
      color: 'blue'
    },
    { 
      icon: Shield, 
      title: 'SSH Config', 
      subtitle: 'SSH hardening',
      features: ['config check', 'best practices'],
      key: 'ssh_guard',
      scanType: 'ssh',
      color: 'cyan'
    },
    { 
      icon: Eye, 
      title: 'Privacy Leaks', 
      subtitle: 'Device access monitor',
      features: ['mic/camera', 'permission check'],
      key: 'privacy_guard',
      scanType: 'privacy',
      color: 'pink'
    },
    { 
      icon: Globe, 
      title: 'Dark Web', 
      subtitle: 'Tor/C2 detection',
      features: ['Tor traffic', 'C2 ports'],
      key: 'darkweb_guard',
      scanType: 'darkweb',
      color: 'violet'
    },
    { 
      icon: Bot, 
      title: 'Hidden Process', 
      subtitle: 'Deep scan only',
      features: ['process hiding', 'stealth detect'],
      key: 'hidden_guard',
      scanType: 'hidden',
      color: 'gray'
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
    
    try {
      const result = await api.runModuleScan(scanType)
      if (result.success) {
        setScanResult({
          module: moduleName,
          type: scanType,
          summary: result.summary,
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

      {/* Full Screen Modal for Scan Results */}
      <ScanResultModal scanResult={scanResult} onClose={() => setScanResult(null)} />
    </div>
  )
}

export default ProtectionModules
