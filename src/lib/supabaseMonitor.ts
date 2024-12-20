import { supabase } from './supabaseClient'

const isDevelopment = import.meta.env.DEV

interface QueryLogEntry {
  table: string
  timestamp: string
  operation: string
  duration: number
  dataSize: number
  args: unknown[]
  trace: string
  result: {
    status: number
    statusText: string
    count: number
    error?: unknown
  }
}

let queryCount = 0
const queryLog: QueryLogEntry[] = []

// Helper to estimate data size in bytes
const getObjectSize = (obj: unknown): number => {
  if (!obj) return 0
  const str = JSON.stringify(obj)
  return str ? str.length : 0
}

// Monkey patch the from method only in development mode
if (isDevelopment) {
  const originalFrom = supabase.from
  supabase.from = (table: string) => {
    const originalResult = originalFrom.call(supabase, table)
    const startTime = Date.now()
    let operations: string[] = []
    let currentArgs: unknown[] = []

    // Create a proxy for the query builder
    return new Proxy(originalResult, {
      get(target: any, prop: string | symbol) {
        const value = target[prop]
        
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            const result = value.apply(target, args)
            operations.push(prop.toString())
            currentArgs.push(args)

            const stack = new Error().stack
              ?.split('\n')
              .slice(2)
              .find(line => line.includes('/src/'))
              ?.trim()
              ?.replace(/^at /, '')

            if (result instanceof Promise) {
              return result.then((data: any) => {
                const duration = Date.now() - startTime
                const dataSize = getObjectSize(data?.data)
                
                const logEntry: QueryLogEntry = {
                  table,
                  timestamp: new Date().toISOString(),
                  operation: operations.join('.'),
                  duration,
                  dataSize,
                  args: currentArgs,
                  trace: stack ? `Called from: ${stack}` : 'Unknown location',
                  result: {
                    status: data?.status || 200,
                    statusText: data?.statusText || 'OK',
                    count: data?.data ? (Array.isArray(data.data) ? data.data.length : 1) : 0,
                    error: data?.error
                  }
                }
                
                queryCount++
                queryLog.push(logEntry)
                
                if (data?.error) {
                  console.error('[Supabase Query Error]', {
                    table,
                    operations,
                    error: data.error,
                    args: currentArgs
                  })
                } else {
                  console.log('[Supabase Query]', logEntry)
                }
                return data
              })
            }

            return result
          }
        }
        
        return value
      }
    })
  }
}

export { supabase }

// Export functions to get query statistics - only in development mode
export const getQueryStats = isDevelopment
  ? () => ({
      totalQueries: queryCount,
      queryLog,
      totalDataSize: queryLog.reduce((sum, entry) => sum + entry.dataSize, 0)
    })
  : () => ({ totalQueries: 0, queryLog: [], totalDataSize: 0 })

// Function to get the latest queries - only in development mode
export const getLatestQueries = isDevelopment
  ? (count: number = 10) => queryLog.slice(-count)
  : () => [] 