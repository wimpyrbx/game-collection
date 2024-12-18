import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaGoogle } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { DndQuote } from '../components/ui/DndQuote'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      // Always redirect to home page after login
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      await signIn()
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/miniatures/images/login/login_background.webp)' }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/80" />
      </div>
      
      <div className="max-w-md w-full mx-4 relative z-10">
        {/* Miniature image */}
        <img 
          src="/miniatures/images/login/login_miniature.webp" 
          alt="Login" 
          className="w-full object-cover rounded-t-xl shadow-xl"
          style={{ marginBottom: '-1px' }}
        />

        {/* Login card */}
        <div className="bg-black/30 backdrop-blur-lg rounded-xl shadow-2xl p-8 border border-white/10">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-900 font-medium disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <FaGoogle className="w-5 h-5 text-blue-600" />
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="mt-6 text-center text-sm text-gray-300 italic">
            <DndQuote />
          </div>
        </div>
      </div>
    </div>
  )
} 