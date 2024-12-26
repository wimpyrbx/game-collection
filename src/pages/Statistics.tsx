import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format, subDays, parseISO, addDays } from 'date-fns'

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

interface HourlyStats {
  hour: number
  count: number
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

// Function to render customized label with percentage and updated style
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#FFFFFF" fontSize={10} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
    </text>
  );
};

function Statistics() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats[]>([])
  const [baseSizeDistribution, setBaseSizeDistribution] = useState<Distribution[]>([])
  const [paintedByDistribution, setPaintedByDistribution] = useState<Distribution[]>([])
  const [typeDistribution, setTypeDistribution] = useState<Distribution[]>([])
  const [processedHourlyStats, setProcessedHourlyStats] = useState<HourlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)

      // Get the date range for daily stats
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const endDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

      // Fetch daily additions
      const { data: additionsData, error: additionsError } = await supabase
        .from('minis')
        .select('created_at')
        .gte('created_at', startDate)
        .lt('created_at', endDate)

      if (additionsError) throw additionsError

      // Fetch daily deletions
      const { data: deletionsData, error: deletionsError } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('action_type', 'MINIATURE_DELETE')
        .not('miniature_id', 'is', null)
        .gte('created_at', startDate)
        .lt('created_at', endDate)

      if (deletionsError) throw deletionsError

      // Fetch all audit logs for the period
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('created_at')
        .in('action_type', ['MINIATURE_CREATE', 'MINIATURE_UPDATE', 'MINIATURE_DELETE'])
        .gte('created_at', startDate)
        .lt('created_at', endDate)

      if (auditError) throw auditError

      // Process daily stats
      const dailyMap = new Map<string, DailyStats>()
      const dateArray = Array.from({ length: 31 }, (_, i) => {
        const date = format(subDays(new Date(), i), 'MMM d')
        dailyMap.set(date, {
          date,
          miniatures_added: 0,
          miniatures_deleted: 0,
          audit_logs: 0
        })
        return date
      }).reverse()

      // Count additions by day
      additionsData.forEach(row => {
        const date = format(parseISO(row.created_at), 'MMM d')
        const stats = dailyMap.get(date)
        if (stats) {
          stats.miniatures_added++
        }
      })

      // Count deletions by day
      deletionsData.forEach(row => {
        const date = format(parseISO(row.created_at), 'MMM d')
        const stats = dailyMap.get(date)
        if (stats) {
          stats.miniatures_deleted++
          stats.audit_logs++
        }
      })

      // Count audit logs by day
      auditData.forEach(row => {
        const date = format(parseISO(row.created_at), 'MMM d')
        const stats = dailyMap.get(date)
        if (stats) {
          stats.audit_logs++
        }
      })

      // Convert map to array and set state
      const dailyStats = dateArray.map(date => dailyMap.get(date)!)
      setDailyStats(dailyStats)

      // Get initial total count
      const { count: initialCount, error: countError } = await supabase
        .from('minis')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', startDate)

      if (countError) throw countError

      // Calculate cumulative stats starting from initial count
      let total = initialCount || 0
      const cumulativeData = dailyStats.map(stat => {
        total += stat.miniatures_added - stat.miniatures_deleted
        return {
          date: stat.date,
          total_miniatures: total
        }
      })
      setCumulativeStats(cumulativeData)

      // Fetch base size distribution
      const { data: baseSizeData, error: baseSizeError } = await supabase
        .from('base_sizes')
        .select(`
          base_size_name,
          minis!inner (id)
        `)

      if (baseSizeError) throw baseSizeError

      setBaseSizeDistribution(baseSizeData.map(item => ({
        name: item.base_size_name,
        value: (item.minis as any[]).length
      })).sort((a, b) => b.value - a.value))

      // Fetch painted by distribution
      const { data: paintedByData, error: paintedByError } = await supabase
        .from('painted_by')
        .select(`
          painted_by_name,
          minis!inner (id)
        `)

      if (paintedByError) throw paintedByError

      setPaintedByDistribution(paintedByData.map(item => ({
        name: item.painted_by_name,
        value: (item.minis as any[]).length
      })).sort((a, b) => b.value - a.value))

      // Fetch type distribution
      const { data: typeData, error: typeError } = await supabase
        .from('mini_types')
        .select(`
          name,
          mini_to_types!inner (mini_id)
        `)

      if (typeError) throw typeError

      setTypeDistribution(typeData.map(item => ({
        name: item.name,
        value: (item.mini_to_types as any[]).length
      })).sort((a, b) => b.value - a.value).slice(0, 10))

      // Fetch hourly audit log distribution
      const { data: hourlyData, error: hourlyError } = await supabase
        .from('audit_logs')
        .select('created_at')

      if (hourlyError) throw hourlyError

      // Process hourly stats
      const hourlyMap = new Map<number, number>()
      // Initialize all hours with 0
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, 0)
      }

      // Count logs by hour
      hourlyData.forEach(row => {
        const hour = new Date(row.created_at).getHours()
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
      })

      // Convert map to array and sort by hour
      const processedStats = Array.from(hourlyMap.entries())
        .map(([hour, count]) => ({
          hour,
          count
        }))
        .sort((a, b) => a.hour - b.hour)

      setProcessedHourlyStats(processedStats)

    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Loading statistics...</div>
  }

  return (
    <div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Daily Activity Chart */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Daily Activity</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" stroke="#94A3B8" tickFormatter={(date) => {
                  const parsedDate = parseISO(date);
                  return isNaN(parsedDate.getTime()) ? '' : format(parsedDate, 'MMM d');
                }} />
                <YAxis stroke="#94A3B8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="miniatures_added" fill="#15803D" />
                <Bar dataKey="miniatures_deleted" fill="#B91C1C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Miniatures Chart */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Total Miniatures Over Time</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total_miniatures" 
                  name="Total Miniatures"
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
      <div className="mb-8">
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Log Entries by Hour</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processedHourlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Base Size Distribution */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 relative">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Base Size Distribution</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
            Total: {calculateTotal(baseSizeDistribution)}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={baseSizeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={renderCustomizedLabel}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {baseSizeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Painted By Distribution */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 relative">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Painted By Distribution</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
            Total: {calculateTotal(paintedByDistribution)}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paintedByDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={renderCustomizedLabel}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {paintedByDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 relative">
          <h2 className="text-xl font-semibold mb-4 text-cyan-100">Type Distribution</h2>
          <div className="absolute top-4 right-4 text-cyan-100">
            Total: {calculateTotal(typeDistribution)}
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={renderCustomizedLabel}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {typeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics; 