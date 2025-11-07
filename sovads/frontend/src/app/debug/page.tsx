'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DebugStats {
  summary: {
    sdkRequests: number
    sdkInteractions: number
    apiCalls: number
    callbacks: number
    errors: {
      sdkRequests: number
      apiCalls: number
      callbacks: number
    }
    avgResponseTime: number
  }
  breakdowns: {
    sdkRequestTypes: Array<{ type: string; count: number }>
    interactionTypes: Array<{ type: string; count: number }>
    apiRoutes: Array<{ route: string; count: number; avgDuration: number }>
    callbackTypes: Array<{ type: string; count: number }>
  }
  hourlyData: Array<{
    hour: string
    requests: number
    interactions: number
    api: number
    callbacks: number
  }>
  topDomains: Array<{ domain: string; count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DebugPage() {
  const [stats, setStats] = useState<DebugStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/stats?hours=${hours}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [hours])

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Dashboard</h1>
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Dashboard</h1>
          <div className="text-center py-20 text-red-500">Failed to load stats</div>
        </div>
      </div>
    )
  }

  // Format hourly data for charts
  const hourlyChartData = stats.hourlyData.map((d) => ({
    time: new Date(d.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    requests: d.requests,
    interactions: d.interactions,
    api: d.api,
    callbacks: d.callbacks,
  }))

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Debug Dashboard</h1>
          <div className="flex gap-4 items-center">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700"
            >
              <option value={1}>Last Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={48}>Last 48 Hours</option>
              <option value={168}>Last Week</option>
            </select>
            <button
              onClick={fetchStats}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-gray-400 text-sm mb-2">SDK Requests</h3>
            <p className="text-3xl font-bold">{stats.summary.sdkRequests.toLocaleString()}</p>
            {stats.summary.errors.sdkRequests > 0 && (
              <p className="text-red-500 text-sm mt-2">
                {stats.summary.errors.sdkRequests} errors
              </p>
            )}
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-gray-400 text-sm mb-2">SDK Interactions</h3>
            <p className="text-3xl font-bold">{stats.summary.sdkInteractions.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-gray-400 text-sm mb-2">API Calls</h3>
            <p className="text-3xl font-bold">{stats.summary.apiCalls.toLocaleString()}</p>
            {stats.summary.errors.apiCalls > 0 && (
              <p className="text-red-500 text-sm mt-2">
                {stats.summary.errors.apiCalls} errors
              </p>
            )}
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-gray-400 text-sm mb-2">Callbacks</h3>
            <p className="text-3xl font-bold">{stats.summary.callbacks.toLocaleString()}</p>
            {stats.summary.errors.callbacks > 0 && (
              <p className="text-red-500 text-sm mt-2">
                {stats.summary.errors.callbacks} errors
              </p>
            )}
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h3 className="text-xl font-bold mb-4">Average Response Time</h3>
          <p className="text-4xl font-bold">
            {stats.summary.avgResponseTime.toFixed(2)}ms
          </p>
        </div>

        {/* Hourly Activity Chart */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h3 className="text-xl font-bold mb-4">Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#0088FE" name="SDK Requests" />
              <Line type="monotone" dataKey="interactions" stroke="#00C49F" name="Interactions" />
              <Line type="monotone" dataKey="api" stroke="#FFBB28" name="API Calls" />
              <Line type="monotone" dataKey="callbacks" stroke="#FF8042" name="Callbacks" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* SDK Request Types */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-xl font-bold mb-4">SDK Request Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.breakdowns.sdkRequestTypes}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {stats.breakdowns.sdkRequestTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interaction Types */}
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Interaction Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.breakdowns.interactionTypes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="type" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#fff' }}
                />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* API Routes */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h3 className="text-xl font-bold mb-4">API Route Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.breakdowns.apiRoutes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="route" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="Request Count" />
              <Bar dataKey="avgDuration" fill="#00C49F" name="Avg Duration (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Domains */}
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <h3 className="text-xl font-bold mb-4">Top Domains</h3>
          <div className="space-y-2">
            {stats.topDomains.map((domain, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-300">{domain.domain || 'Unknown'}</span>
                <span className="font-bold">{domain.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Callback Types */}
        {stats.breakdowns.callbackTypes.length > 0 && (
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Callback Types</h3>
            <div className="space-y-2">
              {stats.breakdowns.callbackTypes.map((callback, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-300">{callback.type}</span>
                  <span className="font-bold">{callback.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

