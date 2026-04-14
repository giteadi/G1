import { useState, useEffect } from 'react'
import { Ban, Unlock, RefreshCw, Loader2, Shield, Globe, CheckCircle } from 'lucide-react'
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
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/20">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">Blocked IPs</h3>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                blocked.length > 0 
                  ? 'bg-red-500/15 text-red-400 border-red-500/20' 
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
              }`}>
                {blocked.length} blocked
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {blocked.length > 0 ? 'Firewall protection active' : 'No blocked IPs'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchBlocked}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {loading && blocked.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading blocked IPs...</p>
          </div>
        </div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-300 mb-1">No IPs Currently Blocked</h4>
          <p className="text-xs text-gray-500">Your system is secure and no threats have been blocked</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Firewall protection active</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {blocked.map((ip, index) => (
            <div 
              key={index}
              className="group flex items-center justify-between p-3.5 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-red-500/30 hover:bg-gray-800/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Globe className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <code className="text-sm font-mono text-gray-300 block">{ip}</code>
                  <span className="text-[10px] text-gray-500">Blocked by firewall</span>
                </div>
              </div>
              <button
                onClick={() => unblockIP(ip)}
                disabled={actionLoading === ip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50 border border-emerald-500/20"
              >
                {actionLoading === ip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
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
