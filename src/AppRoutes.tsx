import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Layout } from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
import Testing from './pages/Testing'
import TypeCategoryAdmin from './pages/TypeCategoryAdmin'
import ProductAdmin from './pages/ProductAdmin'
import MiniatureOverview from './pages/MiniatureOverview'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('ProtectedRoute state:', { user, loading, pathname: location.pathname })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    // Save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="testing" element={<Testing />} />
          <Route path="type-category-admin" element={<TypeCategoryAdmin />} />
          <Route path="product-admin" element={<ProductAdmin />} />
          <Route path="miniature-overview" element={<MiniatureOverview />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
} 