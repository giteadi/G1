import { useState, useEffect } from 'react'
import { Network, FileKey, Cpu, FolderOpen, Clock, AlertTriangle, Shield, Loader2, ChevronDown, ChevronUp, X, CheckCircle, Ban, Trash2 } from 'lucide-react'
import api from '../services/api'

const StatusDot = ({ status }) => {
  const colors = {
    'Active': 'bg-emerald-500',
    'Warning': 'bg-amber-500',
    'Monitoring': 'bg-blue-500',
    'Critical': 'bg-red-500'
  }
  
  return (
    <span className={`relative flex h-2.5 w-2.5`}>
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status] || colors['Monitoring']} opacity-75`}></span>
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status] || colors['Monitoring']}`}></span>
    </span>
  )
}

const ThreatCard = ({ icon: Icon, title, subtitle, status, color, onClick, count = 0 }) => (
  <div 
    className="group bg-gray-800/40 hover:bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 cursor-pointer transition-all duration-200"
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2.5 rounded-xl ${color} shadow-lg group-hover:scale-105 transition-transform flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-white truncate">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{status}</span>
          <StatusDot status={status} />
        </div>
        {count > 0 && (
          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 whitespace-nowrap">
            {count} threats
          </span>
        )}
      </div>
    </div>
  </div>
)

const ThreatDetailModal = ({ threat, onClose, onResolve }) => {
  const [resolving, setResolving] = useState(false)
  const [action, setAction] = useState('ignore')
  const [activeTab, setActiveTab] = useState('overview')

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(threat, action)
    setResolving(false)
    onClose()
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AlertTriangle },
    { id: 'findings', label: `Findings ${threat.findings?.length ? `(${threat.findings.length})` : ''}`, icon: FileKey },
    ...(threat.ai_analysis ? [{ id: 'analysis', label: 'AI Analysis', icon: Shield }] : []),
    { id: 'resolve', label: 'Resolve', icon: CheckCircle },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              threat.severity === 'critical' || threat.severity === 'high' ? 'bg-red-500/20 shadow-lg shadow-red-500/10' :
              threat.severity === 'medium' ? 'bg-amber-500/20 shadow-lg shadow-amber-500/10' : 'bg-blue-500/20 shadow-lg shadow-blue-500/10'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                threat.severity === 'critical' || threat.severity === 'high' ? 'text-red-400' :
                threat.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-white">{threat.type?.replace(/_/g, ' ').toUpperCase() || 'Security Issue'}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  threat.severity === 'critical' || threat.severity === 'high' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                  threat.severity === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                }`}>
                  {(threat.severity || 'Low').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-400">{threat.message}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/50 bg-gray-800/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:bg-gray-700/20'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body - Scrollable */}
        <div className="p-5 md:p-6 max-h-[calc(90vh-280px)] overflow-y-auto">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Threat Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide font-medium">Severity</span>
                  </div>
                  <span className={`font-semibold ${
                    threat.severity === 'critical' || threat.severity === 'high' ? 'text-red-400' :
                    threat.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {(threat.severity || 'Low').toUpperCase()}
                  </span>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide font-medium">Module</span>
                  </div>
                  <span className="text-gray-200 font-medium">
                    {threat.module?.replace(/_/g, ' ') || 'System Scan'}
                  </span>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide font-medium">Detected</span>
                  </div>
                  <span className="text-gray-200 text-sm">
                    {new Date(threat.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Network Info */}
              {(threat.source_ip || threat.process_name || threat.pid) && (
                <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
                  <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-400" />
                    Technical Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {threat.source_ip && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Source IP</span>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                          <span className="text-gray-300 font-mono text-sm">{threat.source_ip}</span>
                        </div>
                      </div>
                    )}
                    {threat.process_name && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Process Name</span>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                          <span className="text-gray-300 font-mono text-sm">{threat.process_name}</span>
                        </div>
                      </div>
                    )}
                    {threat.pid && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Process ID</span>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                          <span className="text-gray-300 font-mono text-sm">{threat.pid}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <FileKey className="w-4 h-4 text-amber-400" />
                  Description
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {threat.message || 'No additional description available for this threat.'}
                </p>
              </div>
            </div>
          )}

          {/* Findings Tab */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              {threat.findings && threat.findings.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-300">
                      Detected Issues ({threat.findings.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {threat.findings.map((finding, i) => (
                      <div key={i} className="bg-black/30 rounded-xl p-4 border border-gray-700/30 flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-sm text-gray-300 break-all">{finding}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileKey className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No detailed findings available</p>
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && threat.ai_analysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-400">AI Analysis</h4>
                  <p className="text-xs text-gray-500">Powered by GPT-4o</p>
                </div>
              </div>
              <div className="bg-blue-500/5 rounded-xl p-5 border border-blue-500/20">
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  {threat.ai_analysis}
                </div>
              </div>
            </div>
          )}

          {/* Resolve Tab */}
          {activeTab === 'resolve' && (
            <div className="space-y-5">
              <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Resolution Action
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/30 transition-all group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      action === 'ignore' ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600'
                    }`}>
                      {action === 'ignore' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <input 
                      type="radio" 
                      name="action" 
                      value="ignore" 
                      checked={action === 'ignore'}
                      onChange={(e) => setAction(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-200 font-medium block">Mark as Resolved</span>
                      <span className="text-xs text-gray-500">Ignore and mark this threat as handled</span>
                    </div>
                  </label>

                  {threat.source_ip && (
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/30 transition-all group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        action === 'block_ip' ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600'
                      }`}>
                        {action === 'block_ip' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <input 
                        type="radio" 
                        name="action" 
                        value="block_ip" 
                        checked={action === 'block_ip'}
                        onChange={(e) => setAction(e.target.value)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-200 font-medium block">Block IP Address</span>
                        <span className="text-xs text-gray-500">Block {threat.source_ip} via firewall</span>
                      </div>
                      <Ban className="w-4 h-4 text-red-400" />
                    </label>
                  )}

                  {threat.pid && (
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/30 transition-all group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        action === 'kill_process' ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600'
                      }`}>
                        {action === 'kill_process' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                      <input 
                        type="radio" 
                        name="action" 
                        value="kill_process" 
                        checked={action === 'kill_process'}
                        onChange={(e) => setAction(e.target.value)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-200 font-medium block">Kill Process</span>
                        <span className="text-xs text-gray-500">Terminate process (PID: {threat.pid})</span>
                      </div>
                      <Trash2 className="w-4 h-4 text-amber-400" />
                    </label>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/30 transition-all group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      action === 'clean' ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600'
                    }`}>
                      {action === 'clean' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <input 
                      type="radio" 
                      name="action" 
                      value="clean" 
                      checked={action === 'clean'}
                      onChange={(e) => setAction(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-200 font-medium block">Run Full Cleanup</span>
                      <span className="text-xs text-gray-500">Execute complete system cleanup</span>
                    </div>
                    <Shield className="w-4 h-4 text-blue-400" />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Resolution
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-all border border-gray-600/30"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SuccessToast = ({ message, onClose }) => (
  <div className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
    <CheckCircle className="w-5 h-5" />
    <span className="font-medium">{message}</span>
    <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">
      <X className="w-4 h-4" />
    </button>
  </div>
)

const CategoryDetailModal = ({ category, threats, onClose, onSelectThreat }) => {
  const categoryThreats = threats.filter(issue => {
    if (category.title === 'Network') return issue.type?.includes('network') || issue.type?.includes('ddos') || issue.type?.includes('outbound')
    if (category.title === 'Auth Logs') return issue.type?.includes('brute') || issue.type?.includes('ssh')
    if (category.title === 'Processes') return issue.type?.includes('crypto') || issue.type?.includes('cpu') || issue.type?.includes('privacy')
    if (category.title === 'Filesystem') return issue.type?.includes('rootkit') || issue.type?.includes('malware')
    if (category.title === 'Cron/Tasks') return issue.type?.includes('cron') || issue.type?.includes('darkweb')
    return false
  })

  const descriptions = {
    'Network': 'Monitors incoming/outgoing network connections, suspicious ports, and potential DDoS attacks.',
    'Auth Logs': 'Tracks SSH login attempts, brute force attacks, and unauthorized access attempts.',
    'Processes': 'Detects crypto miners, hidden processes, high CPU/memory usage, and privacy leaks.',
    'Filesystem': 'Scans for rootkits, malware, unauthorized file changes, and world-writable files.',
    'Cron/Tasks': 'Monitors scheduled tasks, persistence mechanisms, and dark web connections.'
  }

  const Icon = category.icon

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${category.color} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-white">{category.title}</h3>
                <StatusDot status={category.status} />
              </div>
              <p className="text-sm text-gray-400">{category.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 max-h-[calc(85vh-200px)] overflow-y-auto">
          {/* Description */}
          <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30 mb-5">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              About This Monitor
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {descriptions[category.title]}
            </p>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
              <div className="flex items-center gap-2 mt-1">
                <StatusDot status={category.status} />
                <span className="font-semibold text-white">{category.status}</span>
              </div>
            </div>
            <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Detected Threats</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-bold text-2xl ${categoryThreats.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {categoryThreats.length}
                </span>
                <span className="text-xs text-gray-500">issues found</span>
              </div>
            </div>
          </div>

          {/* Threats List */}
          {categoryThreats.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Detected Issues ({categoryThreats.length})
              </h4>
              <div className="space-y-2">
                {categoryThreats.map((threat, index) => (
                  <div 
                    key={index}
                    onClick={() => onSelectThreat(threat)}
                    className="group p-3.5 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-red-500/30 hover:bg-gray-800/70 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            threat.status === 'threat' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {threat.status}
                          </span>
                          <span className="text-sm font-medium text-gray-300 truncate">{threat.message}</span>
                        </div>
                        {threat.source_ip && (
                          <p className="text-xs text-gray-500">IP: {threat.source_ip}</p>
                        )}
                        {threat.pid && (
                          <p className="text-xs text-gray-500">PID: {threat.pid}</p>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-300 -rotate-90 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">No Threats Detected</h4>
              <p className="text-xs text-gray-500">This category is currently secure</p>
            </div>
          )}
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
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [expandedThreats, setExpandedThreats] = useState(new Set())
  const [toast, setToast] = useState(null)

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
      let actionText = ''
      switch(action) {
        case 'block_ip':
          if (threat.source_ip) {
            await api.blockIP(threat.source_ip)
            actionText = `Blocked IP ${threat.source_ip}`
          }
          break
        case 'kill_process':
          if (threat.pid) {
            await api.killProcess(threat.pid)
            actionText = `Killed process (PID: ${threat.pid})`
          }
          break
        case 'clean':
          await api.cleanThreats()
          actionText = 'Full cleanup completed'
          break
        case 'ignore':
        default:
          actionText = 'Threat marked as resolved'
          break
      }
      // Refresh threats
      await fetchThreats()
      await runScan()
      // Show success toast
      setToast(actionText)
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Failed to resolve threat:', e)
      setToast('Failed to resolve threat')
      setTimeout(() => setToast(null), 3000)
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
          <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">Inbound Threats</h3>
              {allIssues.length > 0 ? (
                <span className="text-[10px] font-semibold px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                  {allIssues.length} detected
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20">
                  Secure
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time monitoring active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scanning && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scanning...
            </span>
          )}
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            24/7 Active
          </span>
        </div>
      </div>

      {/* Inbound Threats Cards - 3+2 Grid Layout */}
      <div className="space-y-3">
        {/* Row 1: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {inboundThreats.slice(0, 3).map((threat, index) => (
            <ThreatCard 
              key={index} 
              {...threat}
              count={allIssues.filter(issue => {
                if (threat.title === 'Network') return issue.type?.includes('network') || issue.type?.includes('ddos') || issue.type?.includes('outbound')
                if (threat.title === 'Auth Logs') return issue.type?.includes('brute') || issue.type?.includes('ssh')
                if (threat.title === 'Processes') return issue.type?.includes('crypto') || issue.type?.includes('cpu') || issue.type?.includes('privacy')
                return false
              }).length}
              onClick={() => setSelectedCategory(threat)}
            />
          ))}
        </div>
        {/* Row 2: 2 cards centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {inboundThreats.slice(3, 5).map((threat, index) => (
            <ThreatCard 
              key={index + 3} 
              {...threat}
              count={allIssues.filter(issue => {
                if (threat.title === 'Filesystem') return issue.type?.includes('rootkit') || issue.type?.includes('malware')
                if (threat.title === 'Cron/Tasks') return issue.type?.includes('cron') || issue.type?.includes('darkweb')
                return false
              }).length}
              onClick={() => setSelectedCategory(threat)}
            />
          ))}
        </div>
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

      {selectedCategory && (
        <CategoryDetailModal
          category={selectedCategory}
          threats={allIssues}
          onClose={() => setSelectedCategory(null)}
          onSelectThreat={(threat) => {
            setSelectedCategory(null)
            setSelectedThreat(threat)
          }}
        />
      )}

      {toast && (
        <SuccessToast 
          message={toast} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

export default ThreatMonitor
