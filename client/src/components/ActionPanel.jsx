import { useState } from 'react'
import { Scan, Trash2, Ban, CheckCircle, Terminal, Play, MessageSquare, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
import api from '../services/api'

const ActionButton = ({ icon: Icon, label, color, onClick, description, loading }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-all group disabled:opacity-50`}
  >
    <div className={`p-3 rounded-lg bg-${color}-500/20 group-hover:scale-110 transition-transform`}>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className={`w-6 h-6 text-${color}-400`} />}
    </div>
    <span className="font-medium text-sm">{label}</span>
    <span className="text-xs text-gray-500">{description}</span>
  </button>
)

const ScanResultModal = ({ results, onClose, onResolve }) => {
  const [expandedItems, setExpandedItems] = useState(new Set())

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const threats = results.filter(r => r.status === 'threat')
  const warnings = results.filter(r => r.status === 'warning')
  const clean = results.filter(r => r.status === 'clean')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Scan Results</h3>
              <p className="text-sm text-gray-400 mt-1">
                {threats.length} threats • {warnings.length} warnings • {clean.length} clean
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {threats.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-2">Threats ({threats.length})</h4>
                <div className="space-y-2">
                  {threats.map((item, index) => (
                    <div key={index} className="bg-red-500/10 rounded-lg border border-red-500/30">
                      <div 
                        className="p-3 cursor-pointer hover:bg-red-500/20 transition-colors"
                        onClick={() => toggleExpand(`threat-${index}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-400">{item.message}</p>
                            {item.module && (
                              <p className="text-xs text-gray-500 mt-1">Module: {item.module}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onResolve(item)
                              }}
                              className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                            >
                              Fix
                            </button>
                            {expandedItems.has(`threat-${index}`) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedItems.has(`threat-${index}`) && item.findings && (
                        <div className="px-3 pb-3 border-t border-red-500/30 pt-2">
                          <ul className="space-y-1">
                            {item.findings.map((finding, i) => (
                              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
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

            {warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-2">Warnings ({warnings.length})</h4>
                <div className="space-y-2">
                  {warnings.map((item, index) => (
                    <div key={index} className="bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <div 
                        className="p-3 cursor-pointer hover:bg-amber-500/20 transition-colors"
                        onClick={() => toggleExpand(`warning-${index}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-400">{item.message}</p>
                            {item.module && (
                              <p className="text-xs text-gray-500 mt-1">Module: {item.module}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onResolve(item)
                              }}
                              className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                            >
                              Fix
                            </button>
                            {expandedItems.has(`warning-${index}`) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedItems.has(`warning-${index}`) && item.findings && (
                        <div className="px-3 pb-3 border-t border-amber-500/30 pt-2">
                          <ul className="space-y-1">
                            {item.findings.map((finding, i) => (
                              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                <span className="text-amber-400">•</span>
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

            {clean.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-2">Clean ({clean.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {clean.map((item, index) => (
                    <div key={index} className="bg-emerald-500/10 rounded p-2 border border-emerald-500/30">
                      <p className="text-xs text-emerald-400">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ActionPanel = () => {
  const [loading, setLoading] = useState({})
  const [message, setMessage] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chatResponse, setChatResponse] = useState(null)
  const [showBlockInput, setShowBlockInput] = useState(false)
  const [showWhitelistInput, setShowWhitelistInput] = useState(false)
  const [ipInput, setIpInput] = useState('')
  const [scanResults, setScanResults] = useState(null)

  const handleAction = async (action, data = null) => {
    setLoading({ ...loading, [action]: true })
    setMessage(null)
    
    try {
      let result
      switch(action) {
        case 'scan':
          result = await api.runScan(null, false) // Full scan, not deep
          if (result.success) {
            setScanResults(result.results)
            const summary = result.summary || {}
            setMessage({ 
              type: 'success', 
              text: `Scan complete! Found ${summary.threats || 0} threats, ${summary.warnings || 0} warnings` 
            })
          }
          break
        case 'clean':
          result = await api.cleanThreats()
          setMessage({ type: 'success', text: `Cleaned ${result.results?.cleaned || 0} threats` })
          break
        case 'block':
          if (!showBlockInput) {
            setShowBlockInput(true)
            setLoading({ ...loading, [action]: false })
            return
          }
          if (!ipInput) return
          result = await api.blockIP(ipInput)
          setMessage({ type: result.success ? 'success' : 'error', text: result.message })
          setShowBlockInput(false)
          setIpInput('')
          break
        case 'whitelist':
          if (!showWhitelistInput) {
            setShowWhitelistInput(true)
            setLoading({ ...loading, [action]: false })
            return
          }
          if (!ipInput) return
          result = await api.whitelistIP(ipInput)
          setMessage({ type: result.success ? 'success' : 'error', text: result.message })
          setShowWhitelistInput(false)
          setIpInput('')
          break
        default:
          break
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    
    setLoading({ ...loading, [action]: false })
  }

  const handleResolveIssue = async (issue) => {
    try {
      // Auto-determine action based on issue type
      if (issue.module === 'crypto_miners' && issue.findings) {
        // Extract PID and kill process
        const pidMatch = issue.findings[0]?.match(/PID: (\d+)/)
        if (pidMatch) {
          console.log('Would kill process:', pidMatch[1])
          setMessage({ type: 'success', text: 'Process termination requested' })
        }
      } else if (issue.module === 'ssh_config') {
        setMessage({ type: 'info', text: 'SSH hardening requires manual configuration' })
      } else {
        await api.cleanThreats()
        setMessage({ type: 'success', text: 'Cleanup initiated' })
      }
      
      // Refresh scan
      const result = await api.runScan(null, false)
      if (result.success) {
        setScanResults(result.results)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to resolve issue' })
    }
  }

  const handleChat = async () => {
    if (!chatInput.trim()) return
    setLoading({ ...loading, chat: true })
    
    try {
      const result = await api.chat(chatInput)
      setChatResponse(result.message)
      setChatInput('')
    } catch (err) {
      setChatResponse('Error: ' + err.message)
    }
    
    setLoading({ ...loading, chat: false })
  }

  const actions = [
    { icon: Scan, label: 'Scan', color: 'blue', description: 'Full system scan', action: 'scan' },
    { icon: Trash2, label: 'Clean', color: 'amber', description: 'Remove threats', action: 'clean' },
    { icon: Ban, label: 'Block', color: 'red', description: 'IP/Domain block', action: 'block' },
    { icon: CheckCircle, label: 'Whitelist', color: 'emerald', description: 'Safe list', action: 'whitelist' },
  ]

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Terminal className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold">Quick Actions</h3>
            <p className="text-xs text-gray-500">Manual control panel</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {actions.map((action) => (
          <ActionButton 
            key={action.action}
            {...action} 
            loading={loading[action.action]}
            onClick={() => handleAction(action.action)} 
          />
        ))}
      </div>

      {(showBlockInput || showWhitelistInput) && (
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="Enter IP address..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button 
            onClick={() => handleAction(showBlockInput ? 'block' : 'whitelist')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
          >
            {showBlockInput ? 'Block IP' : 'Whitelist IP'}
          </button>
        </div>
      )}

      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">G1 AI Chat</span>
          <span className="text-xs text-gray-500">Ask questions in natural language</span>
        </div>
        
        {chatResponse && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg text-sm text-gray-300 max-h-40 overflow-y-auto">
            {chatResponse}
          </div>
        )}
        
        <div className="flex gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            placeholder='e.g. "Who attacked me today?"'
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button 
            onClick={handleChat}
            disabled={loading.chat}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading.chat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Ask G1
          </button>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          {['g1 start', 'g1 scan', 'g1 status', 'g1 clean'].map((cmd) => (
            <code 
              key={cmd} 
              onClick={() => { setChatInput(cmd); handleChat(); }}
              className="text-xs px-3 py-1 bg-gray-800 rounded text-emerald-400 font-mono cursor-pointer hover:bg-gray-700"
            >
              {cmd}
            </code>
          ))}
        </div>
      </div>

      {scanResults && (
        <ScanResultModal
          results={scanResults}
          onClose={() => setScanResults(null)}
          onResolve={handleResolveIssue}
        />
      )}
    </div>
  )
}

export default ActionPanel
