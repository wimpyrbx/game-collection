import { useState, useEffect } from 'react'
import { getQueryStats, getLatestQueries } from '../lib/supabaseMonitor'

export function QueryMonitor() {
  const [stats, setStats] = useState(getQueryStats())
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getQueryStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
        <div 
          className="p-2 bg-gray-800 border-b border-gray-700 cursor-pointer flex justify-between items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-medium text-gray-300">
            Queries: {stats.totalQueries} ({(stats.totalDataSize / 1024).toFixed(2)} KB)
          </span>
          <button className="text-gray-400 hover:text-gray-200">
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto">
            {getLatestQueries(20).reverse().map((query, index) => (
              <div 
                key={index} 
                className="p-2 border-b border-gray-700 hover:bg-gray-800 text-xs"
              >
                <div className="flex justify-between text-gray-400">
                  <span>{query.table}</span>
                  <span>{query.duration}ms</span>
                </div>
                <div className="text-gray-300">{query.operation}</div>
                <div className="text-gray-500">
                  {(query.dataSize / 1024).toFixed(2)} KB
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 