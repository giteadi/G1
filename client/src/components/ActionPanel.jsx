import { Scan, Trash2, Ban, CheckCircle, Terminal, Play, MessageSquare } from 'lucide-react'

const ActionButton = ({ icon: Icon, label, color, onClick, description }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-all group ${color}`}
  >
    <div className={`p-3 rounded-lg bg-${color}-500/20 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 text-${color}-400`} />
    </div>
    <span className="font-medium text-sm">{label}</span>
    <span className="text-xs text-gray-500">{description}</span>
  </button>
)

const ActionPanel = () => {
  const actions = [
    { icon: Scan, label: 'Scan', color: 'blue', description: 'Full system scan' },
    { icon: Trash2, label: 'Clean', color: 'amber', description: 'Remove threats' },
    { icon: Ban, label: 'Block', color: 'red', description: 'IP/Domain block' },
    { icon: CheckCircle, label: 'Whitelist', color: 'emerald', description: 'Safe list' },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {actions.map((action, index) => (
          <ActionButton key={index} {...action} onClick={() => console.log(action.label)} />
        ))}
      </div>

      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">G1 AI Chat</span>
          <span className="text-xs text-gray-500">Ask questions in natural language</span>
        </div>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder='e.g. "Who attacked me today?"'
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Play className="w-4 h-4" />
            Ask G1
          </button>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          {['g1 start', 'g1 scan', 'g1 status', 'g1 clean'].map((cmd) => (
            <code key={cmd} className="text-xs px-3 py-1 bg-gray-800 rounded text-emerald-400 font-mono">
              {cmd}
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ActionPanel
