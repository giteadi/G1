import { useState } from 'react'
import { Scan, Trash2, Ban, CheckCircle, Terminal, Play, MessageSquare, Loader2 } from 'lucide-react'
import api from '../services/api'

const ActionButton = ({ icon: Icon, label, color, onClick, description, loading }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-all group ${color} disabled:opacity-50`}
  >
    <div className={`p-3 rounded-lg bg-${color}-500/20 group-hover:scale-110 transition-transform`}>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className={`w-6 h-6 text-${color}-400`} />}
    </div>
    <span className="font-medium text-sm">{label}</span>
    <span className="text-xs text-gray-500">{description}</span>
  </button>
)

const ActionPanel = () => {
  const [loading, setLoading] = useState({})
  const [message, setMessage] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chatResponse, setChatResponse] = useState(null)
  const [showBlockInput, setShowBlockInput] = useState(false)
  const [showWhitelistInput, setShowWhitelistInput] = useState(false)
  const [ipInput, setIpInput] = useState('')

  const handleAction = async (action, data = null) => {
    setLoading({ ...loading, [action]: true })
    setMessage(null)
    
    try {
      let result
      switch(action) {
        case 'scan':
          result = await api.runScan()
          setMessage({ type: 'success', text: `Scan complete! Found ${result.results?.length || 0} issues` })
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
    </div>
  )
}

export default ActionPanel
