import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top bar - fixed height */}
      <div className="h-16 min-h-[4rem] flex-none bgTopBar flex items-center justify-between px-6 w-full">
        <div className="text-gray-100">Logo</div>
        <div className="text-gray-100">Stats: 123 Games</div>
      </div>

      {/* Content area - flex row for sidebar and main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bgSidebar text-gray-100 flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            <h1 className="text-xl font-bold mb-8">Game Collection</h1>
            <nav>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="block p-2 hover:bg-gray-700 rounded">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/testing" className="block p-2 hover:bg-gray-700 rounded">
                    Testing
                  </Link>
                </li>
                <li>
                  <Link to="/type-category-admin" className="block p-2 hover:bg-gray-700 rounded">
                    Type/Category Admin
                  </Link>
                </li>
                <li>
                  <Link to="/product-admin" className="block p-2 hover:bg-gray-700 rounded">
                    Product Admin
                  </Link>
                </li>
                <li>
                  <Link to="/miniature-overview" className="block p-2 hover:bg-gray-700 rounded">
                    Miniature Overview
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 bgBody overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
