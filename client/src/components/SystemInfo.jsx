import { useState, useEffect } from 'react'
import { Server, Cpu, HardDrive, MemoryStick, Loader2, RefreshCw } from 'lucide-react'
import api from '../services/api'

const SystemInfo = () => {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInfo()
  }, [])

  const fetchInfo = async () => {
    setLoading(true)
    const result = await api.fetchSystemInfo()
    if (result) {
      setInfo(result)
    }
    setLoading(false)
  }

  const InfoCard = ({ icon: Icon, title, children }) => (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-700 rounded-lg">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono">{value || 'N/A'}</span>
    </div>
  )

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold">System Information</h3>
            <p className="text-xs text-gray-500">Detailed system specs</p>
          </div>
        </div>
        <button
          onClick={fetchInfo}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        </button>
      </div>

      {loading && !info ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : info ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard icon={Server} title="Operating System">
            <InfoRow label="Platform" value={info.os?.platform} />
            <InfoRow label="Distro" value={info.os?.distro} />
            <InfoRow label="Release" value={info.os?.release} />
            <InfoRow label="Hostname" value={info.os?.hostname} />
          </InfoCard>

          <InfoCard icon={Cpu} title="CPU">
            <InfoRow label="Manufacturer" value={info.cpu?.manufacturer} />
            <InfoRow label="Brand" value={info.cpu?.brand} />
            <InfoRow label="Cores" value={info.cpu?.cores} />
            <InfoRow label="Physical Cores" value={info.cpu?.physicalCores} />
          </InfoCard>

          <InfoCard icon={MemoryStick} title="Memory">
            <InfoRow label="Total" value={`${info.memory?.total} GB`} />
            <InfoRow label="Used" value={`${info.memory?.used} GB`} />
            <InfoRow 
              label="Usage" 
              value={`${((info.memory?.used / info.memory?.total) * 100).toFixed(1)}%`} 
            />
          </InfoCard>

          <InfoCard icon={HardDrive} title="Storage">
            {info.disk?.map((d, i) => (
              <div key={i} className="border-t border-gray-700/50 pt-2 first:border-0 first:pt-0">
                <InfoRow label={`Disk ${i + 1} (${d.fs})`} value={`${d.use}%`} />
                <div className="mt-1 text-xs text-gray-500">
                  {d.used} GB / {d.size} GB
                </div>
                <div className="mt-1 bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${d.use}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </InfoCard>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>Failed to load system information</p>
          <button
            onClick={fetchInfo}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export default SystemInfo
