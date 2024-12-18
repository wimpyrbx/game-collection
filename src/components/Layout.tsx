import { Outlet, useLocation } from 'react-router-dom'
import { PageTransition } from './ui'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from './ui/Sidebar'

export function Layout() {
  const location = useLocation()

  return (
    <>
      {/* Portal container for modals - must be a direct child of body */}
      <div id="modal-root" className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }} />
      
      <div className="min-h-screen flex">
        {/* Background image with overlay - spans entire page */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{ backgroundImage: 'url(/miniatures/images/login/dnd1.png)' }}
        >
          <div className="absolute inset-0 bg-black/80" />
        </div>

        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 ml-[200px] p-6 relative z-0">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-xl p-6">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  )
}
