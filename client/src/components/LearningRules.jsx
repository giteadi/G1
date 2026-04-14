import { useState, useEffect } from 'react'
import { BookOpen, RefreshCw, Loader2, Shield, Globe, Database } from 'lucide-react'
import api from '../services/api'

const LearningRules = () => {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const result = await api.fetchLearningRules()
      if (result?.success && result.data) {
        setRules(result.data)
      }
    } catch (e) {
      console.error('Failed to fetch rules:', e)
    }
    setLoading(false)
  }

  const filteredRules = filter === 'all' 
    ? rules 
    : rules.filter(r => r.type === filter || r.source === filter)

  const getRuleIcon = (type) => {
    switch (type) {
      case 'builtin': return Shield
      case 'gpt': return BookOpen
      case 'intel': return Globe
      default: return Database
    }
  }

  const getRuleColor = (type) => {
    switch (type) {
      case 'builtin': return 'bg-blue-500/20 text-blue-400'
      case 'gpt': return 'bg-purple-500/20 text-purple-400'
      case 'intel': return 'bg-emerald-500/20 text-emerald-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold">Learning Rules</h3>
            <p className="text-xs text-gray-500">{rules.length} rules learned</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="builtin">Built-in</option>
            <option value="gpt">GPT Generated</option>
            <option value="intel">Threat Intel</option>
          </select>
          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {loading && rules.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No rules found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredRules.map((rule, index) => {
            const Icon = getRuleIcon(rule.type || rule.source)
            return (
              <div 
                key={rule.id || index} 
                className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
              >
                <div className={`p-2 rounded-lg ${getRuleColor(rule.type || rule.source)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{rule.name || rule.pattern || 'Unnamed Rule'}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                      {rule.type || rule.source || 'unknown'}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                  )}
                  {rule.confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                        <div 
                          className="h-1 bg-emerald-500 rounded-full"
                          style={{ width: `${rule.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{(rule.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LearningRules
