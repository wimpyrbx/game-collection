import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageTransition } from './ui'
import { AnimatePresence } from 'framer-motion'
import { FaSignOutAlt, FaHome, FaDragon, FaTags, FaBoxes } from 'react-icons/fa'

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const menuItems = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/miniature-overview', label: 'Miniatures', icon: FaDragon },
    { path: '/type-category-admin', label: 'Categories', icon: FaTags },
    { path: '/product-admin', label: 'Products', icon: FaBoxes },
  ]

  const getMenuItemClasses = (isActive: boolean) => `
    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
    transition-all duration-200 border
    ${isActive 
      ? 'bg-cyan-900 border-cyan-700 text-white shadow-lg' 
      : 'text-gray-300 hover:text-white hover:bg-gray-900 border-transparent'}
  `

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background image with overlay - spans entire page */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url(/images/login/login_background.webp)' }}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="bg-gray-800/90 backdrop-blur-sm shadow-lg relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-20">
            {/* Left side - Navigation Links */}
            <div className="flex items-center space-x-2">
              {menuItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <Link
                    key={path}
                    to={path}
                    className={getMenuItemClasses(isActive)}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* Right side - User Info & Sign Out */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-300 hover:text-white bg-red-900/50 hover:bg-red-900 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 border border-transparent hover:border-gray-500"
              >
                <FaSignOutAlt className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 relative z-0">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-xl p-6">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
