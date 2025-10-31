'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OracleStatus {
  isRunning: boolean
  chain: string
  managerAddress: string
  oracleAddress: string
}

interface SystemStats {
  totalCampaigns: number
  totalPublishers: number
  totalEvents: number
  totalRevenue: number
}

export default function AdminDashboard() {
  const [oracleStatus, setOracleStatus] = useState<OracleStatus | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalCampaigns: 0,
    totalPublishers: 0,
    totalEvents: 0,
    totalRevenue: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load oracle status
      const oracleResponse = await fetch('/api/oracle?action=status')
      if (oracleResponse.ok) {
        const oracleData = await oracleResponse.json()
        setOracleStatus(oracleData)
      }

      // Load system stats (mock data for now)
      setSystemStats({
        totalCampaigns: 12,
        totalPublishers: 45,
        totalEvents: 12543,
        totalRevenue: 234.56
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading admin data:', error)
      setIsLoading(false)
    }
  }

  const triggerAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'aggregate'
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Analytics aggregation triggered. Job ID: ${data.jobId}`)
      } else {
        alert('Failed to trigger analytics aggregation')
      }
    } catch (error) {
      console.error('Error triggering analytics:', error)
      alert('Error triggering analytics aggregation')
    }
  }

  const toggleOracle = async () => {
    if (!oracleStatus) return

    try {
      const action = oracleStatus.isRunning ? 'stop' : 'start'
      const response = await fetch('/api/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        await loadData() // Reload data
        alert(`Oracle ${action}ed successfully`)
      } else {
        alert(`Failed to ${action} oracle`)
      }
    } catch (error) {
      console.error('Error toggling oracle:', error)
      alert('Error toggling oracle')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-white">
                SovAds
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/advertiser" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Advertiser
              </Link>
              <Link 
                href="/publisher" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Publisher
              </Link>
              <Link 
                href="/admin" 
                className="text-white px-3 py-2 rounded-md text-sm font-medium bg-gray-800"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="text-2xl font-bold text-white">{systemStats.totalCampaigns}</div>
            <div className="text-gray-400">Total Campaigns</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="text-2xl font-bold text-white">{systemStats.totalPublishers}</div>
            <div className="text-gray-400">Total Publishers</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="text-2xl font-bold text-white">{systemStats.totalEvents.toLocaleString()}</div>
            <div className="text-gray-400">Total Events</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="text-2xl font-bold text-white">{systemStats.totalRevenue.toFixed(2)}</div>
            <div className="text-gray-400">Total Revenue (USDC)</div>
          </div>
        </div>

        {/* Oracle Status */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Oracle Status</h2>
          {oracleStatus ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${oracleStatus.isRunning ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white">
                  {oracleStatus.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Chain:</span>
                  <span className="text-white ml-2">{oracleStatus.chain}</span>
                </div>
                <div>
                  <span className="text-gray-400">Oracle Address:</span>
                  <span className="text-white ml-2 font-mono">{oracleStatus.oracleAddress}</span>
                </div>
                <div>
                  <span className="text-gray-400">Manager Contract:</span>
                  <span className="text-white ml-2 font-mono">{oracleStatus.managerAddress}</span>
                </div>
              </div>
              <button
                onClick={toggleOracle}
                className={`px-4 py-2 rounded-md font-medium ${
                  oracleStatus.isRunning
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {oracleStatus.isRunning ? 'Stop Oracle' : 'Start Oracle'}
              </button>
            </div>
          ) : (
            <div className="text-gray-400">Oracle status unavailable</div>
          )}
        </div>

        {/* System Controls */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">System Controls</h2>
          <div className="space-y-4">
            <button
              onClick={triggerAnalytics}
              className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-100"
            >
              Trigger Analytics Aggregation
            </button>
            <p className="text-sm text-gray-400">
              Manually trigger analytics aggregation for the current day
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Analytics aggregation completed</span>
              <span className="text-gray-400 text-sm">2 minutes ago</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">Payout processed for publisher 0x123...</span>
              <span className="text-gray-400 text-sm">15 minutes ago</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">New campaign created: DeFi Protocol</span>
              <span className="text-gray-400 text-sm">1 hour ago</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Publisher registered: example.com</span>
              <span className="text-gray-400 text-sm">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}