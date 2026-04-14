import { useState, useEffect } from 'react'
import { Ban, Unlock, RefreshCw, Loader2, Shield } from 'lucide-react'
import api from '../services/api'

const BlockedIPs = () => {
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchBlocked()
  }, [])

  const fetchBlocked = async () => {
    setLoading(true)
    try {
      const result = await api.fetchThreats()
      // Get blocked IPs from status endpoint
      const res = await fetch('http://localhost:3000/api/status')
      const data = await res.json()
      if (data.blocked_ips) {
        setBlocked(data.blocked_ips)
      }
    } catch (e) {
      console.error('Failed to fetch blocked IPs:', e)
    }
    setLoading(false)
  }

  const unblockIP = async (ip) => {
    setActionLoading(ip)
    const result = await api.whitelistIP(ip)
    if (result?.success) {
      setBlocked(prev => prev.filter(item => item !== ip))
    }
    setActionLoading(null)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold">Blocked IPs</h3>
            <p className="text-xs text-gray-500">{blocked.length} IPs currently blocked</p>
          </div>
        </div>
        <button
          onClick={fetchBlocked}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {loading && blocked.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
          <p className="text-gray-500">No IPs currently blocked</p>
          <p className="text-xs text-gray-600 mt-1">Your system is secure</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {blocked.map((ip, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center gap-3">
                <Ban className="w-4 h-4 text-red-400" />
                <code className="text-sm font-mono text-gray-300">{ip}</code>
              </div>
              <button
                onClick={() => unblockIP(ip)}
                disabled={actionLoading === ip}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors disabled:opacity-50"
              >
                {actionLoading === ip ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlockedIPs
