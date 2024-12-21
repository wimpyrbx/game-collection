import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as UI from '../components/ui'
import { FaHistory, FaDiceD20 } from 'react-icons/fa'
import { useLocation } from 'react-router-dom'
import type { AuditLog } from '../types/audit'
import { getMiniImagePath } from '../utils/imageUtils'

interface ReferenceData {
  baseSizes: { id: number; base_size_name: string }[];
  paintedBy: { id: number; painted_by_name: string }[];
  productSets: { id: number; name: string }[];
}



interface TagItem {
  tag?: { name: string };
  name?: string;
}

interface TypeItem {
  type?: { name: string };
  name?: string;
  proxy_type?: boolean;
}

const getBaseSizeName = (baseSizes: ReferenceData['baseSizes'], id: number) => {
  const baseSize = baseSizes.find(size => size.id === id)
  if (!baseSize) return 'Unknown'
  return baseSize.base_size_name.charAt(0).toUpperCase() + baseSize.base_size_name.slice(1).toLowerCase()
}

const getPaintedByName = (paintedBy: ReferenceData['paintedBy'], id: number) => {
  const painter = paintedBy.find(p => p.id === id)
  if (!painter) return 'Unknown'
  return painter.painted_by_name.charAt(0).toUpperCase() + painter.painted_by_name.slice(1).toLowerCase()
}

const getProductSetName = (productSets: ReferenceData['productSets'], id: number) => {
  const set = productSets.find(s => s.id === id)
  if (!set) return 'Unknown'
  return set.name
}

const arrowIcon = '<svg class="inline-block w-4 h-4" viewBox="0 0 448 512"><path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>'

function formatChange(field: string, change: any, referenceData: ReferenceData) {
  const getChangeContent = () => {
    switch (field) {
      case 'in_use':
        const oldDate = change.from ? new Date(change.from).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : null
        const newDate = change.to ? new Date(change.to).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : null

        if (!oldDate && newDate) {
          return `<span class="text-green-400">Marked as in use</span>`
        }
        if (oldDate && !newDate) {
          return `<span class="text-red-400">Marked as not in use</span>`
        }
        if (oldDate && newDate) {
          return `
            <span class="text-red-400">${oldDate}</span>
            <span class="text-gray-500 mx-2">${arrowIcon}</span>
            <span class="text-green-400">${newDate}</span>
          `
        }
        return ''

      case 'tags':
        const oldTags = change.from?.map((t: TagItem) => t.tag?.name || t.name) || []
        const newTags = change.to?.map((t: TagItem) => t.tag?.name || t.name) || []
        
        const removedTags = oldTags.filter((tag: string) => !newTags.includes(tag))
        const addedTags = newTags.filter((tag: string) => !oldTags.includes(tag))
        
        if (!removedTags.length && !addedTags.length) return ''

        return `
          <ul class="list-none space-y-1">
            ${removedTags.length ? `<li>Removed: <span class="text-red-400">${removedTags.sort().join('</span>, <span class="text-red-400">')}</span></li>` : ''}
            ${addedTags.length ? `<li>Added: <span class="text-green-400">${addedTags.sort().join('</span>, <span class="text-green-400">')}</span></li>` : ''}
          </ul>`

      case 'types':
        const oldTypes = change.from?.map((t: TypeItem) => ({
          name: t.type?.name || t.name || '',
          isMain: !t.proxy_type
        })) || []

        const newTypes = change.to?.map((t: TypeItem) => ({
          name: t.type?.name || t.name || '',
          isMain: !t.proxy_type
        })) || []
        
        const oldMainType = oldTypes.find((t: { name: string; isMain: boolean }) => t.isMain)
        const newMainType = newTypes.find((t: { name: string; isMain: boolean }) => t.isMain)
        
        const removedTypes = oldTypes
          .filter((type: { name: string }) => !newTypes.some((t: { name: string }) => t.name === type.name))
          .map((t: { name: string }) => t.name)
        const addedTypes = newTypes
          .filter((type: { name: string }) => !oldTypes.some((t: { name: string }) => t.name === type.name))
          .map((t: { name: string }) => t.name)
        
        const mainTypeChanged = oldMainType?.name !== newMainType?.name
        
        if (!removedTypes.length && !addedTypes.length && !mainTypeChanged) return ''

        let mainTypeChangeDesc = ''
        if (mainTypeChanged) {
          if (newTypes.some((t: { name: string }) => t.name === oldMainType?.name)) {
            mainTypeChangeDesc = `<li>Main type: <span class="text-red-400">${oldMainType?.name}</span> <span class="text-gray-500 mx-2">${arrowIcon}</span> <span class="text-green-400">${newMainType?.name}</span></li>`
          } else {
            mainTypeChangeDesc = `<li>Main type set to: <span class="text-green-400">${newMainType?.name}</span></li>`
          }
        }

        return `
          <ul class="list-none space-y-1">
            ${removedTypes.length ? `<li>Removed: <span class="text-red-400">${removedTypes.sort().join('</span>, <span class="text-red-400">')}</span></li>` : ''}
            ${addedTypes.length ? `<li>Added: <span class="text-green-400">${addedTypes.sort().join('</span>, <span class="text-green-400">')}</span></li>` : ''}
            ${mainTypeChangeDesc}
          </ul>`

      default:
        const oldValue = field === 'base_size_id' ? getBaseSizeName(referenceData.baseSizes, change.from) :
                        field === 'painted_by_id' ? getPaintedByName(referenceData.paintedBy, change.from) :
                        field === 'product_set_id' ? getProductSetName(referenceData.productSets, change.from) :
                        change.from
        const newValue = field === 'base_size_id' ? getBaseSizeName(referenceData.baseSizes, change.to) :
                        field === 'painted_by_id' ? getPaintedByName(referenceData.paintedBy, change.to) :
                        field === 'product_set_id' ? getProductSetName(referenceData.productSets, change.to) :
                        change.to

        if ((!oldValue || oldValue === '') && (!newValue || newValue === '')) return ''
        
        // Handle removal case
        if ((!newValue || newValue === '' || newValue === 'Unknown') && oldValue && oldValue !== 'Unknown') {
          return `<span>Removed: <span class="text-red-400">${oldValue}</span></span>`
        }
        
        // Handle new value case
        if ((!oldValue || oldValue === '' || oldValue === 'Unknown') && newValue && newValue !== 'Unknown') {
          return `<span>Added: <span class="text-green-400">${newValue}</span></span>`
        }
        
        // Handle change case
        return `
          <span class="text-red-400">${oldValue}</span>
          <span class="text-gray-500 mx-2">${arrowIcon}</span>
          <span class="text-green-400">${newValue}</span>`
    }
  }

  const fieldName = field === 'base_size_id' ? 'Base Size' :
                   field === 'painted_by_id' ? 'Painted By' :
                   field === 'product_set_id' ? 'Product Set' :
                   field === 'in_use' ? 'In Use Status' :
                   field.charAt(0).toUpperCase() + field.slice(1)

  const content = getChangeContent()
  if (!content) return ''

  return `<div class="bg-gray-900/50 rounded-lg border border-gray-800 inline-block min-w-[150px] transform transition-transform duration-100 ease-out hover:scale-110 hover:z-10 active:scale-105 cursor-default animate-bounce-out">
    <style>
      @keyframes bounceOut {
        0% { transform: scale(1.1); }
        25% { transform: scale(0.95); }
        50% { transform: scale(1.02); }
        75% { transform: scale(0.99); }
        100% { transform: scale(1); }
      }
      .animate-bounce-out {
        animation: bounceOut 0.5s ease-out;
        animation-play-state: paused;
      }
      .animate-bounce-out:hover {
        animation-play-state: paused;
      }
      .animate-bounce-out:not(:hover) {
        animation-play-state: running;
      }
    </style>
    <div class="text-sm font-medium px-2 py-1.5 bg-gray-800 border-b border-gray-700/80">${fieldName}</div>
    <div class="text-sm p-2 bg-gray-900/30">${content}</div>
  </div>`
}

function formatAction(action: string, changes: any, referenceData: ReferenceData) {
  switch (action) {
    case 'MINIATURE_CREATE':
      return 'Created new miniature'
    case 'MINIATURE_UPDATE':
      if (!changes) return 'Updated miniature'
      const changesList = Object.entries(changes)
        .map(([field, change]) => formatChange(field, change, referenceData))
        .filter(change => change)
      if (changesList.length === 0) return 'Updated miniature'
      return `<div class="flex flex-wrap gap-2 justify-end">
        ${changesList.join('')}
      </div>`
    case 'MINIATURE_DELETE':
      return `<div class="flex flex-wrap gap-2 justify-end h-[64px]">
        <div class="bg-red-500/20 rounded-lg border border-red-500/30 inline-flex items-center justify-center min-w-[150px] h-full transform transition-transform duration-100 ease-out hover:scale-110 hover:z-10 active:scale-105 cursor-default animate-bounce-out">
          <style>
            @keyframes bounceOut {
              0% { transform: scale(1.1); }
              25% { transform: scale(0.95); }
              50% { transform: scale(1.02); }
              75% { transform: scale(0.99); }
              100% { transform: scale(1); }
            }
            .animate-bounce-out {
              animation: bounceOut 0.5s ease-out;
              animation-play-state: paused;
            }
            .animate-bounce-out:hover {
              animation-play-state: paused;
            }
            .animate-bounce-out:not(:hover) {
              animation-play-state: running;
            }
          </style>
          <div class="text-lg font-medium text-white text-center">Deleted</div>
        </div>
      </div>`
    case 'IMAGE_UPLOAD':
      return 'Uploaded new image'
    case 'IMAGE_REPLACE':
      return 'Replaced image'
    case 'IMAGE_DELETE':
      return 'Deleted image'
    default:
      return action
  }
}




export default function History() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    baseSizes: [],
    paintedBy: [],
    productSets: []
  })
  const logsPerPage = 10
  const location = useLocation()

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [
          { data: baseSizes },
          { data: paintedBy },
          { data: productSets }
        ] = await Promise.all([
          supabase.from('base_sizes').select('*'),
          supabase.from('painted_by').select('*'),
          supabase.from('product_sets').select('*')
        ])

        setReferenceData({
          baseSizes: baseSizes || [],
          paintedBy: paintedBy || [],
          productSets: productSets || []
        })
      } catch (error) {
        console.error('Error fetching reference data:', error)
      }
    }

    fetchReferenceData()
  }, [])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(prev => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages])

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      try {
        // First get total count
        const { count } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })

        if (count) {
          setTotalPages(Math.ceil(count / logsPerPage))
        }

        // Then get paginated logs
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1)

        if (error) throw error

        // Get user info separately
        const userIds = [...new Set(data.map(log => log.user_id))]
        let users: { id: string; email: string }[] = []
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, email')
            .filter('id', 'in', `(${userIds.join(',')})`)
          
          if (!usersError && usersData) {
            users = usersData
          } else {
            console.error('Error fetching users:', usersError)
          }
        }

        // Get miniature info separately for non-deleted miniatures
        const miniatureIds = [...new Set(data.map(log => log.miniature_id))]
        let miniatures: { id: number; name: string }[] = []
        if (miniatureIds.length > 0) {
          const { data: minisData, error: minisError } = await supabase
            .from('minis')
            .select('id, name')
            .filter('id', 'in', `(${miniatureIds.join(',')})`)
          
          if (!minisError && minisData) {
            miniatures = minisData
          } else {
            console.error('Error fetching miniatures:', minisError)
          }
        }

        // Combine the data
        const logsWithUsers = data.map(log => ({
          ...log,
          user: users.find(u => u.id === log.user_id),
          miniature: miniatures.find(m => m.id === log.miniature_id) || 
            (log.action_type === 'MINIATURE_DELETE' ? 
              { id: log.miniature_id, name: `${log.metadata?.miniature?.name} (Deleted)` } : 
              { id: log.miniature_id, name: log.metadata?.miniature?.name })
        })) as AuditLog[]

        setLogs(logsWithUsers)
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [currentPage, location.key])

  if (loading) {
    return (
      <div className="p-8">
        <UI.LoadingSpinner message="Loading history..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <UI.PageHeader bgColor="none">
        <UI.PageHeaderTextGroup>
          <UI.PageHeaderText>
            <div className="flex items-center gap-2">
              <FaHistory className="w-6 h-6" />
              History
            </div>
          </UI.PageHeaderText>
          <UI.PageHeaderSubText>
            View changes made to miniatures
          </UI.PageHeaderSubText>
        </UI.PageHeaderTextGroup>
      </UI.PageHeader>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <colgroup>
            <col className="w-[400px]" />
            <col className="w-full" />
          </colgroup>
          <tbody className="divide-y divide-gray-800">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800/30">
                <td className="px-3 py-2 w-[400px]">
                  <div className="flex gap-3 h-[64px]">
                    <div className="h-full aspect-square flex-shrink-0 rounded-lg overflow-hidden">
                      {log.action_type === 'MINIATURE_DELETE' ? (
                        <div className="w-full h-full flex items-center justify-center bg-red-500/20">
                          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : log.miniature?.id ? (
                        <div className="w-full h-full bg-black/30 flex items-center justify-center">
                          <img 
                            key={`mini-${log.miniature.id}`}
                            src={getMiniImagePath(log.miniature.id, 'thumb')}
                            alt={log.miniature.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'block'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) fallback.classList.add('hidden')
                            }}
                          />
                          <FaDiceD20 className="absolute w-8 h-8 text-gray-600 hidden" />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-xl font-medium truncate">
                        {log.action_type === 'MINIATURE_DELETE' ? (
                          <span className="text-red-400">{log.miniature?.name}</span>
                        ) : (
                          log.miniature?.name || 'Unknown Miniature'
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {log.action_type === 'MINIATURE_CREATE' && <span className="text-green-400">Added</span>}
                        {log.action_type === 'MINIATURE_UPDATE' && <span className="text-blue-400">Edited</span>}
                        {log.action_type === 'MINIATURE_DELETE' && <span className="text-red-400">Deleted</span>}
                        {log.action_type === 'IMAGE_UPLOAD' && <span className="text-purple-400">Image Upload</span>}
                        {log.action_type === 'IMAGE_REPLACE' && <span className="text-purple-400">Image Replace</span>}
                        {log.action_type === 'IMAGE_DELETE' && <span className="text-purple-400">Image Delete</span>}
                      </div>
                      <div className="text-sm flex items-center gap-2 text-ellipsis overflow-hidden whitespace-nowrap">
                        <span className="text-gray-300 truncate">
                          {process.env.NODE_ENV === 'development' 
                            ? 'Development User'
                            : log.user?.email || 'Unknown User'}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">
                          {new Date(log.created_at).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex justify-end">
                    <div dangerouslySetInnerHTML={{ 
                      __html: formatAction(log.action_type, log.changes, referenceData) 
                    }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          {/* Left section - First and Previous */}
          <div className="flex gap-2">
            <UI.Button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              variant="btnPrimary"
              size="sm"
            >
              First
            </UI.Button>
            <UI.Button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={currentPage === 1}
              variant="btnPrimary"
              size="sm"
            >
              «
            </UI.Button>
          </div>

          {/* Center section - Page numbers */}
          <div className="flex gap-2">
            {Array.from({ length: totalPages <= 3 ? totalPages : 3 }, (_, i) => {
              const pageNum = totalPages <= 3 ? i + 1 : currentPage + i - 1
              if (pageNum < 1 || pageNum > totalPages) return null
              return (
                <UI.Button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  variant={pageNum === currentPage ? 'btnSuccess' : 'btnPrimary'}
                  size="sm"
                >
                  {pageNum}
                </UI.Button>
              )
            })}
          </div>

          {/* Right section - Next and Last */}
          <div className="flex gap-2">
            <UI.Button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage === totalPages}
              variant="btnPrimary"
              size="sm"
            >
              »
            </UI.Button>
            <UI.Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              variant="btnPrimary"
              size="sm"
            >
              Last ({totalPages})
            </UI.Button>
          </div>
        </div>
      )}
    </div>
  )
} 