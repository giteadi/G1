import { Cpu, HardDrive, Wifi, AlertCircle } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, subtext, unit = '%', showBar = true, onClick }) => (
  <div 
    className={`bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold">{value}{unit}</span>
    </div>
    <h3 className="text-gray-400 text-sm">{label}</h3>
    <p className="text-xs text-gray-500 mt-1">{subtext}</p>
    
    {showBar && unit === '%' && (
      <div className="mt-4 bg-gray-800 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            color.replace('bg-', 'bg-').replace('/20', '')
          }`}
          style={{ width: `${Math.min(value, 100)}%` }}
        ></div>
      </div>
    )}
  </div>
)

const SystemStats = ({ data, onViewThreats }) => {
  // Format network bytes per second - shows appropriate unit (B/s, KB/s, MB/s)
  const formatNet = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB/s'
    if (bytes < 1024) return `${bytes} B/s`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`
    return `${(bytes / 1048576).toFixed(1)} MB/s`
  }

  // Format RAM with actual GB values from server
  const ramSubtext = data.ram_used_gb && data.ram_total_gb 
    ? `${data.ram_used_gb}GB / ${data.ram_total_gb}GB`
    : `${data.ram}% used`

  const stats = [
    { 
      icon: Cpu, 
      label: 'CPU Usage', 
      value: data.cpu, 
      color: 'bg-blue-500/20', 
      subtext: `${data.cpu_cores || 8} cores active`,
      unit: '%',
      showBar: true
    },
    { 
      icon: HardDrive, 
      label: 'RAM Usage', 
      value: data.ram, 
      color: 'bg-purple-500/20', 
      subtext: ramSubtext,
      unit: '%',
      showBar: true
    },
    { 
      icon: Wifi, 
      label: 'Network I/O', 
      value: formatNet(data.net_rx), 
      color: 'bg-cyan-500/20', 
      subtext: `TX: ${formatNet(data.net_tx)} • RX/TX traffic`,
      unit: '',
      showBar: false  // Network ki bar nahi - value % nahi hai
    },
    { 
      icon: AlertCircle, 
      label: 'Active Threats', 
      value: data.threats || 0, 
      color: 'bg-red-500/20', 
      subtext: 'Detected threats',
      unit: '',
      showBar: false,
      onClick: onViewThreats
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}

export default SystemStats
