import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format, parseISO, addDays } from 'date-fns'
import { useMinis } from '../hooks/useMinis'
import type { Mini } from '../types/mini'
import { supabase } from '../lib/supabase'

interface DailyStats {
  date: string
  miniatures_added: number
  miniatures_deleted: number
  audit_logs: number
}

interface CumulativeStats {
  date: string
  total_miniatures: number
}

interface Distribution {
  name: string
  value: number
}

interface TagStats extends Distribution {}
interface MaterialStats extends Distribution {}
interface LocationStats extends Distribution {}

interface HourlyStats {
  hour: number
  count: number
}

interface ProductSetStats {
  name: string
  unique_count: number
  total_count: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  labelFormatter?: (value: string) => string
}

// Darker color palette for dark mode charts
const COLORS = [
  '#05505C', // Darker cyan
  '#1A6B7A', // Darker teal
  '#2A7D8C', // Darker blue
  '#1E5F5F', // Darker emerald
  '#1C6A6A', // Darker teal
  '#2A6F8C', // Darker sky blue
  '#3A5F8C', // Darker blue
  '#4A4F8C', // Darker indigo
  '#5A5F8C', // Darker indigo
  '#6A6F8C'  // Darker lavender
]

// Add custom label style for pie charts

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, labelFormatter }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const formattedTime = labelFormatter ? labelFormatter(label!) : label

    // Handle hourly activity chart tooltip
    if (payload[0].payload && typeof payload[0].payload.hour === 'number') {
      return (
        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 text-sm mb-2 font-medium">{formattedTime}</p>
          <p className="text-white text-sm mb-2">
            <span style={{ color: payload[0].color }}>Entries:</span> {payload[0].value}
          </p>
        </div>
      );
    }

    // Handle other charts
    return (
      <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-gray-200 text-sm mb-1">{label}</p>
        {payload.map((pld: { color: string; name: string; value: number }, index: number) => (
          <p key={index} className="text-white text-sm">
            <span style={{ color: pld.color }}>{pld.name}</span>: {pld.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom pie tooltip with percentage
const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: { value: number }) => sum + entry.value, 0);
    const percent = total ? (payload[0].value / total) * 100 : 0;
    return (
      <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-white text-sm">
          <span style={{ color: payload[0].color }}>{payload[0].name}</span>: {payload[0].value} ({percent.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

// Function to calculate total value of a distribution
const calculateTotal = (distribution: Distribution[]) => {
  return distribution.reduce((acc, item) => acc + item.value, 0);
};

function Statistics() {
  const { loading: minisLoading, getAllMinis } = useMinis(10000) // Large page size to get all miniatures
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats[]>([])
  const [baseSizeDistribution, setBaseSizeDistribution] = useState<Distribution[]>([])
  const [paintedByDistribution, setPaintedByDistribution] = useState<Distribution[]>([])
  const [paintedByDetails, setPaintedByDetails] = useState<Map<string, { entries: number; total: number }>>(new Map())
  const [typeDistribution, setTypeDistribution] = useState<Distribution[]>([])
  const [processedHourlyStats, setProcessedHourlyStats] = useState<HourlyStats[]>([])
  const [productSetStats, setProductSetStats] = useState<ProductSetStats[]>([])
  const [tagStats, setTagStats] = useState<TagStats[]>([])
  const [materialStats, setMaterialStats] = useState<MaterialStats[]>([])
  const [locationStats, setLocationStats] = useState<LocationStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalTypeCount, setTotalTypeCount] = useState(0)
  const [totalTypeQuantity, setTotalTypeQuantity] = useState(0)

  useEffect(() => {
    const loadAllMinis = async () => {
      try {
        const allMinisData = await getAllMinis()
        if (allMinisData?.data) {
          //console.log('All miniatures loaded:', allMinisData.data.length)
          fetchStatistics(allMinisData.data)
        }
      } catch (error) {
        console.error('Error loading all miniatures:', error)
      }
    }

    loadAllMinis()
  }, [getAllMinis])

  const fetchStatistics = async (allMinis: Mini[]) => {
    try {
      setIsLoading(true)

      // Get the date range for daily stats
      const endDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

      // Fetch daily activity stats from audit_logs
      const { error: dailyError } = await supabase
        .from('audit_logs')
        .select('created_at, action_type')
        .lt('created_at', `${endDate}T00:00:00`)
        .order('created_at')

      if (dailyError) {
        console.error('Error fetching daily activity:', dailyError)
      }

      // Sort miniatures by creation date
      const sortedMinis = [...allMinis].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      // Process daily activity stats
      const dailyActivityMap = new Map<string, number>()
      allMinis.forEach(mini => {
        const date = format(new Date(mini.created_at), 'yyyy-MM-dd')
        dailyActivityMap.set(date, (dailyActivityMap.get(date) || 0) + 1)
      })

      // Find the earliest date with activity
      let earliestDate = new Date()
      dailyActivityMap.forEach((stats, dateStr) => {
        if (stats > 0) {
          const date = new Date(dateStr)
          if (date < earliestDate) {
            earliestDate = date
          }
        }
      })

      // Fill in all dates from earliest to now
      const dailyStatsArray: DailyStats[] = []
      let currentDate = new Date(sortedMinis[0]?.created_at || new Date())
      const endDateTime = new Date()
      
      while (currentDate <= endDateTime) {
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        dailyStatsArray.push({
          date: dateStr,
          miniatures_added: dailyActivityMap.get(dateStr) || 0,
          miniatures_deleted: 0,
          audit_logs: 0
        })
        currentDate = addDays(currentDate, 1)
      }
      setDailyStats(dailyStatsArray)

      // Process cumulative stats
      const cumulativeData: CumulativeStats[] = []
      let runningTotal = 0
      let currentCumulativeDate = new Date(sortedMinis[0]?.created_at || new Date())
      const lastDate = new Date(sortedMinis[sortedMinis.length - 1]?.created_at || new Date())

      while (currentCumulativeDate <= lastDate) {
        const dateStr = format(currentCumulativeDate, 'yyyy-MM-dd')
        const minisOnThisDate = sortedMinis.filter(mini => 
          format(new Date(mini.created_at), 'yyyy-MM-dd') === dateStr
        )
        runningTotal += minisOnThisDate.length // Count unique miniatures instead of total quantity
        
        cumulativeData.push({
          date: dateStr,
          total_miniatures: runningTotal
        })
        
        currentCumulativeDate = addDays(currentCumulativeDate, 1)
      }
      setCumulativeStats(cumulativeData)

      // Process hourly activity stats from audit_log
      const { data: hourlyData, error: hourlyError } = await supabase
        .from('audit_logs')
        .select('created_at')
        .lt('created_at', `${endDate}T00:00:00`)
        .order('created_at')

      if (hourlyError) {
        console.error('Error fetching hourly activity:', hourlyError)
      }

      const hourlyStats = new Array(24).fill(0)
      hourlyData?.forEach(log => {
        const hour = new Date(log.created_at).getHours()
        hourlyStats[hour]++
      })

      setProcessedHourlyStats(
        hourlyStats.map((count, hour) => ({
          hour,
          count
        }))
      )

      // Process base size data
      const baseSizeCounts = new Map<string, number>()
      allMinis.forEach((mini: Mini) => {
        const baseSizeName = mini.base_sizes?.base_size_name
        if (baseSizeName) {
          baseSizeCounts.set(baseSizeName, (baseSizeCounts.get(baseSizeName) || 0) + 1)
        }
      })

      setBaseSizeDistribution(Array.from(baseSizeCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value))

      // Process painted by data
      const paintedByCounts = new Map<string, { entries: number; total: number }>()
      allMinis.forEach((mini: Mini) => {
        const paintedByName = mini.painted_by?.painted_by_name
        if (paintedByName) {
          if (!paintedByCounts.has(paintedByName)) {
            paintedByCounts.set(paintedByName, { entries: 0, total: 0 })
          }
          const stats = paintedByCounts.get(paintedByName)!
          stats.entries++
          stats.total += mini.quantity || 1
        }
      })

      setPaintedByDetails(paintedByCounts)
      setPaintedByDistribution(Array.from(paintedByCounts.entries())
        .map(([name, stats]) => ({ name, value: stats.entries }))
        .sort((a, b) => b.value - a.value))

      // Process material data
      const materialCounts = new Map<string, number>()
      allMinis.forEach((mini: Mini) => {
        const materialName = mini.material?.material_name
        if (materialName) {
          materialCounts.set(materialName, (materialCounts.get(materialName) || 0) + 1)
        } else {
          materialCounts.set('Unknown', (materialCounts.get('Unknown') || 0) + 1)
        }
      })

      setMaterialStats(Array.from(materialCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value))

      // Process location data
      const locationCounts = new Map<string, number>()
      allMinis.forEach((mini: Mini) => {
        const locationName = mini.location || 'Unknown'
        locationCounts.set(locationName, (locationCounts.get(locationName) || 0) + 1)
      })

      setLocationStats(Array.from(locationCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value))

      // Process product set data
      const setStatsMap = new Map<string, { unique: number; total: number }>()
      setStatsMap.set('No product set', { unique: 0, total: 0 })

      allMinis.forEach((mini: Mini) => {
        const setName = mini.product_sets?.name || 'No product set'
        if (!setStatsMap.has(setName)) {
          setStatsMap.set(setName, { unique: 0, total: 0 })
        }
        const stats = setStatsMap.get(setName)!
        stats.unique++
        stats.total += mini.quantity || 1
      })

      const productSetStatsArray = Array.from(setStatsMap.entries()).map(([name, stats]) => ({
        name,
        unique_count: stats.unique,
        total_count: stats.total
      })).sort((a, b) => b.total_count - a.total_count)

      setProductSetStats(productSetStatsArray)

      // Process type distribution
      const typeCounts = new Map<string, number>()
      let totalQuantity = 0
      allMinis.forEach((mini: Mini) => {
        mini.types?.forEach(typeInfo => {
          if (!typeInfo.proxy_type) { // Only count main types, not proxy types
            const typeName = typeInfo.type.name
            const quantity = mini.quantity || 1
            typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + quantity)
            totalQuantity += quantity
          }
        })
      })

      setTotalTypeCount(typeCounts.size)
      setTotalTypeQuantity(totalQuantity)
      setTypeDistribution(Array.from(typeCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15)) // Only keep top 15 types

      // Process tag statistics
      const tagCounts = new Map<string, number>()
      allMinis.forEach((mini: Mini) => {
        mini.tags?.forEach(tagInfo => {
          const tagName = tagInfo.tag.name
          tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + (mini.quantity || 1))
        })
      })

      setTagStats(Array.from(tagCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value))

    } catch (error) {
      console.error('Error processing statistics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (minisLoading || isLoading) {
    return <div>Loading statistics...</div>
  }

  return (
    <div className="flex gap-8">
      {/* Product Set Statistics - Left Sidebar */}
      <div className="w-[450px] shrink-0">
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 sticky top-4">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Product Set Statistics</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
            Total Sets: {productSetStats.length}
          </div>
          <div style={{ height: `${Math.max(800, productSetStats.length * 28)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productSetStats}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#94A3B8"
                  tickCount={5}
                  domain={[0, 'dataMax']}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94A3B8"
                  width={180}
                  interval={0}
                  fontSize={12}
                  tickFormatter={(value) => value}
                  style={{ whiteSpace: 'nowrap', textAlign: 'left' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg">
                          <p className="text-gray-200 text-sm mb-2 font-medium">{label}</p>
                          <p className="text-white text-sm">
                            <span style={{ color: '#0F766E' }}>Unique Miniatures:</span> {payload[0].value}
                          </p>
                          <p className="text-white text-sm">
                            <span style={{ color: '#15803D' }}>Total Quantity:</span> {payload[1].value}
                          </p>
                          <p className="text-white text-sm">
                            <span className="text-gray-400">Average per Mini:</span> {
                              payload[0]?.value && Number(payload[0].value) > 0
                                ? (Number(payload[1].value) / Number(payload[0].value)).toFixed(1)
                                : '0'
                            }
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="unique_count"
                  name="Unique Miniatures"
                  fill="#0F766E"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="total_count"
                  name="Total Quantity"
                  fill="#15803D"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Right side charts */}
      <div className="flex-1">
        {/* Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Activity Chart */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Daily Activity</h2>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dailyStats} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94A3B8" 
                    angle={-45}
                    textAnchor="end"
                    height={40}
                    tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="miniatures_added" name="Miniatures Added" fill="#15803D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Miniatures Chart */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Total Unique Miniatures Over Time</h2>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={cumulativeStats} margin={{ top: 20, right: 20, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94A3B8"
                    angle={-45}
                    textAnchor="end"
                    height={40}
                    tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  />
                <YAxis stroke="#94A3B8" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total_miniatures" 
                    name="Total Unique Miniatures"
                  stroke="#0F766E"
                  fill="#0F766E"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  activeDot={{ 
                    stroke: '#134E4A',
                    fill: '#134E4A',
                    r: 6,
                    strokeWidth: 2
                  }}
                  dot={false}
                  isAnimationActive={false}
                />
                <defs>
                  <style>
                    {`
                      .recharts-area-area {
                        fill: #0F766E !important;
                        stroke: #0F766E !important;
                      }
                      .recharts-area-area:hover {
                        fill: #0A4F5A !important;
                        stroke: #0A4F5A !important;
                      }
                      .recharts-area-curve {
                        stroke: #0F766E !important;
                      }
                      .recharts-area-curve:hover {
                        stroke: #0A4F5A !important;
                      }
                      .recharts-active-dot {
                        fill: #134E4A !important;
                        stroke: #134E4A !important;
                      }
                      .recharts-tooltip-cursor {
                        fill: #334455 !important;
                        stroke: #223344 !important;
                      }
                    `}
                  </style>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Activity Chart */}
        <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Log Entries by Hour</h2>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={processedHourlyStats} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#94A3B8"
                  tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  content={<CustomTooltip />}
                  labelFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`}
                />
                <Bar
                  dataKey="count"
                  name="Log Entries"
                  fill="#0F766E"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Base Size Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Base Sizes</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
            Total: {calculateTotal(baseSizeDistribution)}
          </div>
            <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={baseSizeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                >
                  {baseSizeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Base Size</th>
                    <th className="text-right text-cyan-100 py-2">Count</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {baseSizeDistribution.sort((a, b) => b.value - a.value).map((item, index) => (
                    <tr key={item.name} className="border-t border-gray-700">
                      <td className="py-2 text-gray-300">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </td>
                      <td className="text-right text-gray-300">{item.value}</td>
                      <td className="text-right text-gray-400">
                        {((item.value / calculateTotal(baseSizeDistribution)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        {/* Painted By Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Painted By</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
              Total Entries: {calculateTotal(paintedByDistribution)}
          </div>
            <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={paintedByDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                >
                  {paintedByDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const name = String(payload[0].name);
                      const stats = paintedByDetails.get(name);
                      const total = calculateTotal(paintedByDistribution);
                      const percent = (stats?.entries || 0) / total * 100;
                      return (
                        <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg">
                          <p className="text-white text-sm">
                            <span style={{ color: payload[0].color }}>{name}</span>
                          </p>
                          <p className="text-white text-sm">
                            Entries: {stats?.entries || 0} ({percent.toFixed(1)}%)
                          </p>
                          {stats && <p className="text-white text-sm">
                            Total Quantity: {stats.total}
                          </p>}
                        </div>
                      );
                    }
                    return null;
                  }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Painted By</th>
                    <th className="text-right text-cyan-100 py-2">Entries</th>
                    <th className="text-right text-cyan-100 py-2">Total</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {paintedByDistribution.sort((a, b) => b.value - a.value).map((item, index) => {
                    const stats = paintedByDetails.get(item.name);
                    return (
                      <tr key={item.name} className="border-t border-gray-700">
                        <td className="py-2 text-gray-300">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                          {item.name}
                        </td>
                        <td className="text-right text-gray-300">{stats?.entries || 0}</td>
                        <td className="text-right text-gray-300">{stats?.total || 0}</td>
                        <td className="text-right text-gray-400">
                          {((stats?.entries || 0) / calculateTotal(paintedByDistribution) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>

        {/* Type Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Main Types</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
              Total: {totalTypeCount} main types in use
          </div>
            <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={typeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                >
                  {typeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Type</th>
                    <th className="text-right text-cyan-100 py-2">Count</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {typeDistribution.sort((a, b) => b.value - a.value).map((item, index) => (
                    <tr key={item.name} className="border-t border-gray-700">
                      <td className="py-2 text-gray-300">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </td>
                      <td className="text-right text-gray-300">{item.value}</td>
                      <td className="text-right text-gray-400">
                        {((item.value / totalTypeQuantity) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {totalTypeCount > 15 && (
                    <tr className="border-t border-gray-700">
                      <td colSpan={3} className="py-2 text-gray-400 text-center">
                        + {totalTypeCount - 15} types used across {totalTypeQuantity - typeDistribution.reduce((sum, type) => sum + type.value, 0)} miniatures
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tag Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Most Used Tags</h2>
            <div className="absolute top-4 right-4 text-cyan-100">
              Total Tags: {tagStats.length}
            </div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={tagStats.slice(0, 10)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                  >
                    {tagStats.slice(0, 10).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Tag</th>
                    <th className="text-right text-cyan-100 py-2">Count</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {tagStats.slice(0, 10).map((item, index) => (
                    <tr key={item.name} className="border-t border-gray-700">
                      <td className="py-2 text-gray-300">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </td>
                      <td className="text-right text-gray-300">{item.value}</td>
                      <td className="text-right text-gray-400">
                        {((item.value / tagStats.reduce((sum, tag) => sum + tag.value, 0)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Material Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Material</h2>
            <div className="absolute top-4 right-4 text-cyan-100">
              Total: {calculateTotal(materialStats)}
            </div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={materialStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                  >
                    {materialStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Material</th>
                    <th className="text-right text-cyan-100 py-2">Count</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {materialStats.map((item, index) => (
                    <tr key={item.name} className="border-t border-gray-700">
                      <td className="py-2 text-gray-300">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </td>
                      <td className="text-right text-gray-300">{item.value}</td>
                      <td className="text-right text-gray-400">
                        {((item.value / calculateTotal(materialStats)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Location Distribution */}
          <div className="bg-gray-800/50 px-2 py-4 rounded-lg border border-gray-700 relative">
            <h2 className="text-xl font-semibold mb-4 text-cyan-100 px-2">Location</h2>
            <div className="absolute top-4 right-4 text-cyan-100">
              Total: {calculateTotal(locationStats)}
            </div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={locationStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={false}
                    labelLine={false}
                  >
                    {locationStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-cyan-100 py-2">Location</th>
                    <th className="text-right text-cyan-100 py-2">Count</th>
                    <th className="text-right text-cyan-100 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {locationStats.map((item, index) => (
                    <tr key={item.name} className="border-t border-gray-700">
                      <td className="py-2 text-gray-300">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </td>
                      <td className="text-right text-gray-300">{item.value}</td>
                      <td className="text-right text-gray-400">
                        {((item.value / calculateTotal(locationStats)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics; 