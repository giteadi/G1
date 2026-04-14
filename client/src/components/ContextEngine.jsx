import { Brain, MemoryStick, TrendingUp, Activity } from 'lucide-react'

const ContextEngine = () => {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Brain className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold">Context Engine</h3>
          <p className="text-xs text-gray-500">Pattern memory + baseline learning</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium">Pattern Memory</span>
            </div>
            <span className="text-xs text-emerald-400">Active</span>
          </div>
          <p className="text-xs text-gray-500">
            Har event ka context store karta hai, normal vs abnormal samajhta hai
          </p>
          <div className="mt-3 flex gap-2">
            <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded">1,247 patterns</span>
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">baseline: daily</span>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Learning Status</span>
            </div>
            <span className="text-xs text-emerald-400">Learning</span>
          </div>
          <div className="mt-2 bg-gray-700 rounded-full h-2">
            <div className="h-2 bg-emerald-500 rounded-full" style={{ width: '78%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">78% baseline confidence achieved</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>24/7 AI Brain analyzing events</span>
        </div>
      </div>
    </div>
  )
}

export default ContextEngine
