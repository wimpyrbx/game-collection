import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top bar - now at the top level */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 w-full">
        <div className="text-gray-100">Logo</div>
        <div className="text-gray-100">Stats: 123 Games</div>
      </div>

      {/* Content area - flex row for sidebar and main */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 text-gray-100 flex-shrink-0 border-r border-gray-700">
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
		  <Link to="/admin" className="block p-2 hover:bg-gray-700 rounded">
		    Admin
		  </Link>
		</li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 bg-gray-900 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
