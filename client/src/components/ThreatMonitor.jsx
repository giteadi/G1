import { useState, useEffect } from 'react'
import { Network, FileKey, Cpu, FolderOpen, Clock, AlertTriangle, Shield, Loader2, ChevronDown, ChevronUp, X, CheckCircle, Ban, Trash2 } from 'lucide-react'
import api from '../services/api'

const ThreatCard = ({ icon: Icon, title, subtitle, status, color }) => (
  <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 border border-gray-700/50">
    <div className="flex items-center justify-between gap-2 md:gap-3">
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h4 className="font-medium text-sm text-white truncate">{title}</h4>
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
        status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
        status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
        'bg-gray-700 text-gray-400'
      }`}>
        {status}
      </span>
    </div>
  </div>
)

const ThreatDetailModal = ({ threat, onClose, onResolve }) => {
  const [resolving, setResolving] = useState(false)
  const [action, setAction] = useState('ignore')

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(threat, action)
    setResolving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                threat.severity === 'critical' || threat.severity === 'high' ? 'bg-red-500/20' :
                threat.severity === 'medium' ? 'bg-amber-500/20' : 'bg-blue-500/20'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  threat.severity === 'critical' || threat.severity === 'high' ? 'text-red-400' :
                  threat.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                }`} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{threat.type || 'Security Issue'}</h3>
                <p className="text-sm text-gray-400">{threat.message}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <h4 className="text-sm font-medium mb-2 text-gray-300">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity:</span>
                  <span className={`font-medium ${
                    threat.severity === 'critical' || threat.severity === 'high' ? 'text-red-400' :
                    threat.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {threat.severity || 'Low'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-gray-300">{threat.status || 'Active'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Module:</span>
                  <span className="text-gray-300">{threat.module || 'N/A'}</span>
                </div>
                {threat.source_ip && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source IP:</span>
                    <span className="text-gray-300 font-mono">{threat.source_ip}</span>
                  </div>
                )}
                {threat.process_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Process:</span>
                    <span className="text-gray-300 font-mono">{threat.process_name}</span>
                  </div>
                )}
                {threat.pid && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">PID:</span>
                    <span className="text-gray-300 font-mono">{threat.pid}</span>
                  </div>
                )}
              </div>
            </div>

            {threat.findings && threat.findings.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-medium mb-2 text-gray-300">Findings</h4>
                <ul className="space-y-1">
                  {threat.findings.map((finding, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {threat.ai_analysis && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <h4 className="text-sm font-medium mb-2 text-blue-400">AI Analysis</h4>
                <p className="text-sm text-gray-300">{threat.ai_analysis}</p>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <h4 className="text-sm font-medium mb-3 text-gray-300">Resolution Action</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="action" 
                    value="ignore" 
                    checked={action === 'ignore'}
                    onChange={(e) => setAction(e.target.value)}
                    className="text-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Mark as resolved (ignore)</span>
                </label>
                {threat.source_ip && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="action" 
                      value="block_ip" 
                      checked={action === 'block_ip'}
                      onChange={(e) => setAction(e.target.value)}
                      className="text-emerald-500"
                    />
                    <span className="text-sm text-gray-300">Block IP address</span>
                  </label>
                )}
                {threat.pid && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="action" 
                      value="kill_process" 
                      checked={action === 'kill_process'}
                      onChange={(e) => setAction(e.target.value)}
                      className="text-emerald-500"
                    />
                    <span className="text-sm text-gray-300">Kill process (PID: {threat.pid})</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="action" 
                    value="clean" 
                    checked={action === 'clean'}
                    onChange={(e) => setAction(e.target.value)}
                    className="text-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Run cleanup</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resolving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Resolve Threat
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ThreatMonitor = ({ detailed = false, threatStats }) => {
  const [threats, setThreats] = useState([])
  const [scanResults, setScanResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedThreat, setSelectedThreat] = useState(null)
  const [expandedThreats, setExpandedThreats] = useState(new Set())

  const inboundThreats = [
    { icon: Network, title: 'Network', subtitle: 'ports, packets', status: 'Active', color: 'bg-red-500' },
    { icon: FileKey, title: 'Auth Logs', subtitle: 'SSH, logins', status: 'Active', color: 'bg-red-500' },
    { icon: Cpu, title: 'Processes', subtitle: 'CPU, memory', status: 'Warning', color: 'bg-amber-500' },
    { icon: FolderOpen, title: 'Filesystem', subtitle: 'file changes', status: 'Active', color: 'bg-red-500' },
    { icon: Clock, title: 'Cron/Tasks', subtitle: 'persistence', status: 'Monitoring', color: 'bg-blue-500' },
  ]

  useEffect(() => {
    fetchThreats()
    runScan()
    const interval = setInterval(() => {
      fetchThreats()
      runScan()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchThreats = async () => {
    setLoading(true)
    const result = await api.fetchThreats()
    if (result) {
      setThreats(Array.isArray(result) ? result : [])
    }
    setLoading(false)
  }

  const runScan = async () => {
    setScanning(true)
    const result = await api.runScan('full')
    if (result?.success) {
      const issues = result.results.filter(r => r.status === 'threat' || r.status === 'warning')
      setScanResults(issues)
    }
    setScanning(false)
  }

  const handleResolve = async (threat, action) => {
    try {
      switch(action) {
        case 'block_ip':
          if (threat.source_ip) {
            await api.blockIP(threat.source_ip)
          }
          break
        case 'kill_process':
          // Would need a kill process endpoint
          console.log('Kill process:', threat.pid)
          break
        case 'clean':
          await api.cleanThreats()
          break
        case 'ignore':
        default:
          // Just mark as resolved
          break
      }
      // Refresh threats
      await fetchThreats()
      await runScan()
    } catch (e) {
      console.error('Failed to resolve threat:', e)
    }
  }

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedThreats)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedThreats(newExpanded)
  }

  const allIssues = [...scanResults, ...threats]

  return (
    <div className={`bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800 ${detailed ? 'col-span-full' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold">
              Inbound Threats 
              {allIssues.length > 0 && (
                <span className="ml-2 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                  {allIssues.length} detected
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500">Real-time monitoring active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scanning && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Shield className="w-4 h-4" />
            24/7 Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {inboundThreats.map((threat, index) => (
          <ThreatCard key={index} {...threat} />
        ))}
      </div>

      {detailed && allIssues.length > 0 && (
        <div className="mt-6 border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Detected Issues ({allIssues.length})</h4>
            <button
              onClick={runScan}
              disabled={scanning}
              className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Rescan'}
            </button>
          </div>
          <div className="space-y-2">
            {allIssues.map((issue, index) => (
              <div key={index} className={`bg-gray-800/50 rounded-lg border ${
                issue.status === 'threat' ? 'border-red-500/30' : 'border-amber-500/30'
              }`}>
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          issue.status === 'threat' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {issue.status}
                        </span>
                        <span className="text-sm font-medium text-gray-300 truncate">{issue.message}</span>
                      </div>
                      {issue.module && (
                        <p className="text-xs text-gray-500">Module: {issue.module}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedThreat(issue)
                        }}
                        className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                      >
                        Resolve
                      </button>
                      {expandedThreats.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                {expandedThreats.has(index) && issue.findings && (
                  <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Details:</h5>
                    <ul className="space-y-1">
                      {issue.findings.map((finding, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                          <span className="text-red-400">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detailed && allIssues.length === 0 && !loading && (
        <div className="mt-6 border-t border-gray-800 pt-6 text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
          <p>No threats detected. System secure.</p>
        </div>
      )}

      {selectedThreat && (
        <ThreatDetailModal
          threat={selectedThreat}
          onClose={() => setSelectedThreat(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  )
}

export default ThreatMonitor
