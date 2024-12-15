import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background image with overlay - spans entire page */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url(/images/login/login_background.webp)' }}
      >
        <div className="absolute inset-0 bg-black/90" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="bg-gray-800/90 backdrop-blur-sm shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Navigation Links */}
            <div className="flex">
              <div className="flex space-x-4 items-center">
                <Link to="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </Link>
                <Link to="/miniature-overview" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Miniatures
                </Link>
                <Link to="/type-category-admin" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Categories
                </Link>
                <Link to="/product-admin" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Products
                </Link>
              </div>
            </div>

            {/* Right side - User Info & Sign Out */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 relative z-0">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
