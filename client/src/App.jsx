import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SystemStats from './components/SystemStats'
import ThreatMonitor from './components/ThreatMonitor'
import ProtectionModules from './components/ProtectionModules'
import ActionPanel from './components/ActionPanel'
import ContextEngine from './components/ContextEngine'
import SettingsPanel from './components/Settings'
import SystemInfo from './components/SystemInfo'
import LearningRules from './components/LearningRules'
import BlockedIPs from './components/BlockedIPs'
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
  const [threatStats, setThreatStats] = useState({ count: 0, recent: [] })
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
        cpu_cores: data.cpu_cores || 8,
        ram: data.ram || 0,
        ram_used_gb: data.ram_used_gb,
        ram_total_gb: data.ram_total_gb,
        net_rx: data.net_rx || 0,
        net_tx: data.net_tx || 0,
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
    const learningInterval = setInterval(fetchLearningStats, 30000)

    // Fetch threat stats
    const fetchThreatStats = async () => {
      const result = await api.fetchThreats()
      if (result) {
        const threats = Array.isArray(result) ? result : []
        setThreatStats({ count: threats.length, recent: threats.slice(0, 5) })
        setSystemData(prev => ({ ...prev, threats: threats.length }))
      }
    }
    fetchThreatStats()
    const threatInterval = setInterval(fetchThreatStats, 30000)

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('metrics')
      clearInterval(learningInterval)
      clearInterval(threatInterval)
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
                <ThreatMonitor threatStats={threatStats} />
                <ContextEngine learningStats={learningStats} />
              </div>
              
              <ProtectionModules />
              
              <ActionPanel />
            </div>
          )}
          
          {activeTab === 'threats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-red-400">Threat Analysis</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ThreatMonitor detailed threatStats={threatStats} />
                </div>
                <div>
                  <BlockedIPs />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'protection' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-amber-400">Protection & System</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProtectionModules detailed />
                <SystemInfo />
              </div>
              <LearningRules />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-blue-400">System Settings</h2>
              <SettingsPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
