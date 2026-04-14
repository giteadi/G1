import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SystemStats from './components/SystemStats'
import ThreatMonitor from './components/ThreatMonitor'
import ProtectionModules from './components/ProtectionModules'
import ActionPanel from './components/ActionPanel'
import ContextEngine from './components/ContextEngine'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [systemData, setSystemData] = useState({
    cpu: 45,
    ram: 62,
    net: 30,
    threats: 0
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemData(prev => ({
        cpu: Math.floor(Math.random() * 30) + 40,
        ram: Math.floor(Math.random() * 20) + 50,
        net: Math.floor(Math.random() * 50) + 10,
        threats: prev.threats
      }))
    }, 3000)
    return () => clearInterval(interval)
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
