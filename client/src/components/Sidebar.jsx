import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Settings, Activity, Cpu, Menu, X, Loader2 } from 'lucide-react'
import api from '../services/api'

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [status, setStatus] = useState({ status: 'active', threats: { total: 0 } })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true)
      try {
        const res = await fetch('http://localhost:3000/api/status')
        const data = await res.json()
        if (data) {
          setStatus(data)
        }
      } catch (e) {
        console.error('Failed to fetch status:', e)
      }
      setLoading(false)
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const menuItems = [
    { id: 'dashboard', icon: Shield, label: 'Dashboard' },
    { id: 'threats', icon: AlertTriangle, label: 'Threats' },
    { id: 'protection', icon: Cpu, label: 'Protection' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold">G1 Guardian</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 pt-16">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map(item => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveTab(item.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === item.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 border-r border-gray-800 flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">G1 Guardian</h1>
            <p className="text-xs text-emerald-400">AI Powered Security</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">System Status</span>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              status.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-400">
              {status.status === 'active' ? 'Protected & Active' : 'System Issue'}
            </span>
          </div>
          {status.threats?.total > 0 && (
            <div className="mt-2 text-xs text-red-400">
              {status.threats.total} threats detected
            </div>
          )}
          {status.uptime && (
            <div className="mt-1 text-xs text-gray-500">
              Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
            </div>
          )}
        </div>
      </div>
      </aside>
    </>
  )
}

export default Sidebar
