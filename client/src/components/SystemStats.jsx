import { Cpu, HardDrive, Wifi, AlertCircle } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold">{value}%</span>
    </div>
    <h3 className="text-gray-400 text-sm">{label}</h3>
    <p className="text-xs text-gray-500 mt-1">{subtext}</p>
    
    <div className="mt-4 bg-gray-800 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-500 ${
          color.replace('bg-', 'bg-').replace('/20', '')
        }`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
)

const SystemStats = ({ data }) => {
  const stats = [
    { icon: Cpu, label: 'CPU Usage', value: data.cpu, color: 'bg-blue-500/20', subtext: '8 cores active' },
    { icon: HardDrive, label: 'RAM Usage', value: data.ram, color: 'bg-purple-500/20', subtext: '16GB / 32GB' },
    { icon: Wifi, label: 'Network I/O', value: data.net, color: 'bg-cyan-500/20', subtext: '2.4 MB/s' },
    { icon: AlertCircle, label: 'Active Threats', value: data.threats, color: 'bg-red-500/20', subtext: 'Last scan: 2m ago' },
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
