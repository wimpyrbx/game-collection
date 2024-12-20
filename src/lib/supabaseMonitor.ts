import { supabase } from './supabase'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

interface QueryLogEntry {
  table: string
  timestamp: string
  operation: string
  duration: number
  dataSize: number
  args: any[]
  trace: string
  result: {
    status: number
    statusText: string
    count: number
    error?: any
  }
}

let queryCount = 0
const queryLog: QueryLogEntry[] = []

// Helper to estimate data size in bytes
const getObjectSize = (obj: any): number => {
  if (!obj) return 0
  const str = JSON.stringify(obj)
  return str ? str.length : 0
}

// Create a proxy to monitor Supabase queries
const monitoredSupabase = new Proxy(supabase, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => {
        const startTime = Date.now()
        let operations: string[] = []
        let currentArgs: any[] = []

        const createProxy = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj

          return new Proxy(obj, {
            get(target, prop) {
              const value = target[prop]
              
              if (typeof value === 'function') {
                return (...args: any[]) => {
                  const result = value.apply(target, args)
                  operations.push(prop.toString())
                  currentArgs.push(args)

                  // Get the call stack but format it nicely
                  const stack = new Error().stack
                    ?.split('\n')
                    .slice(2) // Skip the Error constructor and this function
                    .find(line => line.includes('/src/')) // Find the first app source file
                    ?.trim()
                    ?.replace(/^at /, '') // Remove the 'at ' prefix

                  // If it's a Promise, handle it
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
                    }).catch((error: any) => {
                      const duration = Date.now() - startTime
                      const logEntry: QueryLogEntry = {
                        table,
                        timestamp: new Date().toISOString(),
                        operation: operations.join('.'),
                        duration,
                        dataSize: 0,
                        args: currentArgs,
                        trace: stack ? `Called from: ${stack}` : 'Unknown location',
                        result: {
                          status: 500,
                          statusText: error?.message || 'Error',
                          count: 0,
                          error
                        }
                      }
                      
                      queryCount++
                      queryLog.push(logEntry)
                      
                      console.error('[Supabase Query Error]', {
                        table,
                        operations,
                        error,
                        args: currentArgs
                      })
                      throw error
                    })
                  }

                  // For non-Promise results, return a new proxy to allow method chaining
                  return createProxy(result)
                }
              }
              
              // For non-function properties, return them as is
              return value
            }
          })
        }

        return createProxy(target.from(table))
      }
    }
    return target[prop as keyof typeof target]
  }
})

// Export functions to get query statistics
export const getQueryStats = () => ({
  totalQueries: queryCount,
  queryLog,
  totalDataSize: queryLog.reduce((sum, entry) => sum + entry.dataSize, 0)
})

// Function to get the latest queries
export const getLatestQueries = (count: number = 10) => {
  return queryLog.slice(-count)
}

export { monitoredSupabase as supabase } 