import { Network, FileKey, Cpu, FolderOpen, Clock, AlertTriangle, Shield } from 'lucide-react'

const ThreatCard = ({ icon: Icon, title, subtitle, status, color }) => (
  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${
        status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
        status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
        'bg-gray-700 text-gray-400'
      }`}>
        {status}
      </span>
    </div>
  </div>
)

const ThreatMonitor = ({ detailed = false }) => {
  const inboundThreats = [
    { icon: Network, title: 'Network', subtitle: 'ports, packets', status: 'Active', color: 'bg-red-500' },
    { icon: FileKey, title: 'Auth Logs', subtitle: 'SSH, logins', status: 'Active', color: 'bg-red-500' },
    { icon: Cpu, title: 'Processes', subtitle: 'CPU, memory', status: 'Warning', color: 'bg-amber-500' },
    { icon: FolderOpen, title: 'Filesystem', subtitle: 'file changes', status: 'Active', color: 'bg-red-500' },
    { icon: Clock, title: 'Cron/Tasks', subtitle: 'persistence', status: 'Monitoring', color: 'bg-blue-500' },
  ]

  const recentThreats = [
    { type: 'Brute Force', source: '192.168.1.45', time: '2m ago', severity: 'High' },
    { type: 'Port Scan', source: '10.0.0.12', time: '5m ago', severity: 'Medium' },
  ]

  return (
    <div className={`bg-gray-900 rounded-xl p-6 border border-gray-800 ${detailed ? 'col-span-full' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold">Inbound Threats</h3>
            <p className="text-xs text-gray-500">Real-time monitoring active</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 flex items-center gap-1">
          <Shield className="w-4 h-4" />
          24/7 Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {inboundThreats.map((threat, index) => (
          <ThreatCard key={index} {...threat} />
        ))}
      </div>

      {detailed && (
        <div className="mt-6 border-t border-gray-800 pt-6">
          <h4 className="font-medium mb-4">Recent Detections</h4>
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
                {recentThreats.map((threat, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-3">{threat.type}</td>
                    <td className="py-3 font-mono text-xs">{threat.source}</td>
                    <td className="py-3 text-gray-500">{threat.time}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        threat.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {threat.severity}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-emerald-400">Blocked</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThreatMonitor
