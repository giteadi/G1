import { useState, useEffect } from 'react'
import { Bell, User, Search, Loader2 } from 'lucide-react'
import api from '../services/api'

const Header = () => {
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchThreats = async () => {
      setLoading(true)
      const result = await api.fetchThreats()
      if (result && Array.isArray(result)) {
        // Convert recent threats to notifications
        const recent = result.slice(0, 5).map(t => ({
          id: t.id,
          type: t.severity === 'high' || t.severity === 'critical' ? 'danger' : 'warning',
          message: `${t.type || 'Threat'} detected from ${t.source_ip || 'unknown'}`,
          time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Just now',
          read: false
        }))
        setNotifications(recent)
      }
      setLoading(false)
    }
    fetchThreats()
    const interval = setInterval(fetchThreats, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-dropdown')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search threats, logs..."
            className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm w-80 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative notification-dropdown">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setShowDropdown(!showDropdown)
            }}
            className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50">
              <div className="p-3 border-b border-gray-800">
                <h4 className="font-medium text-sm">Notifications</h4>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No new notifications
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <div 
                      key={n.id}
                      className={`p-3 border-b border-gray-800/50 hover:bg-gray-800 cursor-pointer ${
                        !n.read ? 'bg-gray-800/30' : ''
                      }`}
                      onClick={() => {
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          n.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">{n.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
          <div className="text-right">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-gray-500">Server Manager</p>
          </div>
          <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
