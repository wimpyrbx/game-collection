import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Layout } from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import TypeCategoryAdmin from './pages/TypeCategoryAdmin'
import ProductAdmin from './pages/ProductAdmin'
import MiniatureOverview from './pages/MiniatureOverview'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth()
  const location = useLocation()

  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setShowLoading(true)
      }
    }, 500)

    if (!loading) {
      setShowLoading(false)
    }

    return () => clearTimeout(timeout)
  }, [loading])

  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  if (!loading && (!session || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!loading && session && user) {
    return <>{children}</>
  }

  return null
}

// Add this component to handle the auth callback
function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hash } = location
  
  useEffect(() => {
    async function handleCallback() {
      if (hash) {
        try {
          // Let Supabase handle the token exchange
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) throw error
          
          if (session) {
            // Use navigate instead of window.location for smoother transition
            navigate('/', { replace: true })
          }
        } catch (error) {
          console.error('Auth callback error:', error)
          navigate('/login', { replace: true })
        }
      }
    }
    
    handleCallback()
  }, [hash, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-xl flex items-center gap-3">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing authentication...
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="type-category-admin" element={<TypeCategoryAdmin />} />
          <Route path="product-admin" element={<ProductAdmin />} />
          <Route path="miniature-overview" element={<MiniatureOverview />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
} 