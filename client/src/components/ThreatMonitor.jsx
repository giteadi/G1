import { useState, useEffect } from 'react'
import { Network, FileKey, Cpu, FolderOpen, Clock, AlertTriangle, Shield, Loader2 } from 'lucide-react'
import api from '../services/api'

const ThreatCard = ({ icon: Icon, title, subtitle, status, color }) => (
  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h4 className="font-medium text-sm text-white">{title}</h4>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
        status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
        status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
        'bg-gray-700 text-gray-400'
      }`}>
        {status}
      </span>
    </div>
  </div>
)

const ThreatMonitor = ({ detailed = false, threatStats }) => {
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(false)

  const inboundThreats = [
    { icon: Network, title: 'Network', subtitle: 'ports, packets', status: 'Active', color: 'bg-red-500' },
    { icon: FileKey, title: 'Auth Logs', subtitle: 'SSH, logins', status: 'Active', color: 'bg-red-500' },
    { icon: Cpu, title: 'Processes', subtitle: 'CPU, memory', status: 'Warning', color: 'bg-amber-500' },
    { icon: FolderOpen, title: 'Filesystem', subtitle: 'file changes', status: 'Active', color: 'bg-red-500' },
    { icon: Clock, title: 'Cron/Tasks', subtitle: 'persistence', status: 'Monitoring', color: 'bg-blue-500' },
  ]

  useEffect(() => {
    const fetchThreats = async () => {
      setLoading(true)
      const result = await api.fetchThreats()
      if (result) {
        setThreats(Array.isArray(result) ? result : [])
      }
      setLoading(false)
    }
    fetchThreats()
    const interval = setInterval(fetchThreats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`bg-gray-900 rounded-xl p-6 border border-gray-800 ${detailed ? 'col-span-full' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold">
              Inbound Threats 
              {threatStats?.count > 0 && (
                <span className="ml-2 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                  {threatStats.count} detected
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500">Real-time monitoring active</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 flex items-center gap-1">
          <Shield className="w-4 h-4" />
          24/7 Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {inboundThreats.map((threat, index) => (
          <ThreatCard key={index} {...threat} />
        ))}
      </div>

      {detailed && (
        <div className="mt-6 border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Recent Detections</h4>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="text-left pb-3">Type</th>
                  <th className="text-left pb-3">Source</th>
                  <th className="text-left pb-3">Time</th>
                  <th className="text-left pb-3">Severity</th>
                  <th className="text-left pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {threats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      {loading ? 'Loading threats...' : 'No threats detected. System secure.'}
                    </td>
                  </tr>
                ) : (
                  threats.slice(0, 10).map((threat, index) => (
                    <tr key={threat.id || index} className="border-b border-gray-800/50">
                      <td className="py-3">{threat.type || 'Unknown'}</td>
                      <td className="py-3 font-mono text-xs">{threat.source_ip || threat.ip || 'N/A'}</td>
                      <td className="py-3 text-gray-500">{threat.timestamp ? new Date(threat.timestamp).toLocaleString() : 'N/A'}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          threat.severity === 'critical' || threat.severity === 'high' ? 'bg-red-500/20 text-red-400' : 
                          threat.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {threat.severity || 'Low'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs ${threat.status === 'blocked' || threat.blocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {threat.status === 'blocked' || threat.blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThreatMonitor
