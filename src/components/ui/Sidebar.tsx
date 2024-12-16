import { FaDiceD6, FaBoxes, FaSignOutAlt, FaTags, FaHome } from 'react-icons/fa'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const menuItems = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/miniature-overview', label: 'Miniatures', icon: FaDiceD6 },
    { path: '/type-category-admin', label: 'Categories', icon: FaTags },
    { path: '/product-admin', label: 'Products', icon: FaBoxes },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="fixed left-0 top-0 h-full w-[200px] bg-gray-800/80 backdrop-blur-sm shadow-xl z-10">
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-center text-white">Game Collection</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-cyan-900 text-white shadow-lg border border-cyan-700'
                      : 'text-gray-300 hover:text-white hover:bg-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700">
          <div className="mb-4 px-4 text-sm text-gray-300 truncate">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white bg-red-900/50 hover:bg-red-900 rounded-lg transition-colors border border-transparent hover:border-gray-500"
          >
            <FaSignOutAlt className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
} 