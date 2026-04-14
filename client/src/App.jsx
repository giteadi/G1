import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SystemStats from './components/SystemStats'
import ThreatMonitor from './components/ThreatMonitor'
import ProtectionModules from './components/ProtectionModules'
import ActionPanel from './components/ActionPanel'
import ContextEngine from './components/ContextEngine'
import api from './services/api'

const socket = io('http://localhost:3000')

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [systemData, setSystemData] = useState({
    cpu: 45,
    ram: 62,
    net: 30,
    threats: 0
  })
  const [learningStats, setLearningStats] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Socket.io connection
    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to G1 Guardian')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from G1 Guardian')
    })

    socket.on('metrics', (data) => {
      setSystemData({
        cpu: data.cpu || 0,
        ram: data.ram || 0,
        net: Math.round((data.net_rx || 0) / 1024 / 1024),
        threats: data.blocked_count || 0
      })
    })

    // Fetch learning stats
    const fetchLearningStats = async () => {
      const result = await api.fetchLearningStats()
      if (result?.success) {
        setLearningStats(result.data)
      }
    }
    fetchLearningStats()
    const interval = setInterval(fetchLearningStats, 30000)

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('metrics')
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col lg:pt-0 pt-16">
        <div className="hidden lg:block">
          <Header />
        </div>
        
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-emerald-400">
                G1 — Living Security Guardian
              </h2>
              
              <SystemStats data={systemData} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ThreatMonitor />
                <ContextEngine />
              </div>
              
              <ProtectionModules />
              
              <ActionPanel />
            </div>
          )}
          
          {activeTab === 'threats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-red-400">Threat Analysis</h2>
              <ThreatMonitor detailed />
            </div>
          )}
          
          {activeTab === 'protection' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-amber-400">Protection Modules</h2>
              <ProtectionModules detailed />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-blue-400">System Settings</h2>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <p className="text-gray-400">Settings panel coming soon...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
