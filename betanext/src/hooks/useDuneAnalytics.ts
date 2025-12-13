import { useState, useEffect } from 'react'
import { DuneClient } from '@duneanalytics/client-sdk'

export interface DuneProjectAnalytics {
  project_id: number
  total_votes_celo: number
  unique_voters: number
  total_vote_transactions: number
  rank: number
}

export interface DuneAnalyticsResult {
  data: DuneProjectAnalytics[]
  isLoading: boolean
  error: Error | null
  lastUpdated: Date | null
}

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY || 'RhOV8GB5STREkHcovMFrRmoklzOrQKTi'
const DUNE_QUERY_ID = 6349526

/**
 * Hook to fetch analytics data from Dune Analytics
 * Uses query ID 6349526 which provides top projects by votes
 */
export function useDuneAnalytics() {
  const [result, setResult] = useState<DuneAnalyticsResult>({
    data: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  })

  useEffect(() => {
    const fetchDuneData = async () => {
      setResult(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const dune = new DuneClient(DUNE_API_KEY)
        const queryResult = await dune.getLatestResult({ queryId: DUNE_QUERY_ID })

        // Handle different possible response structures
        let rows: any[] = []
        if (queryResult.result?.rows) {
          rows = queryResult.result.rows
        } else if (Array.isArray(queryResult.result)) {
          rows = queryResult.result
        } else if (queryResult.result?.rows) {
          rows = queryResult.result.rows
        }

        if (rows && rows.length > 0) {
          const data = rows as DuneProjectAnalytics[]
          setResult({
            data,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          })
        } else {
          throw new Error('No data returned from Dune query')
        }
      } catch (err) {
        console.error('Error fetching Dune analytics:', err)
        setResult({
          data: [],
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to fetch Dune analytics'),
          lastUpdated: null
        })
      }
    }

    fetchDuneData()
  }, [])

  return result
}

/**
 * Function to export analytics data as CSV
 */
export function exportAnalyticsToCSV(data: DuneProjectAnalytics[], filename = 'analytics.csv') {
  if (data.length === 0) return

  // CSV header
  const headers = ['Project ID', 'Total Votes (CELO)', 'Unique Voters', 'Total Vote Transactions', 'Rank']
  const csvRows = [headers.join(',')]

  // CSV rows
  data.forEach(item => {
    const row = [
      item.project_id.toString(),
      item.total_votes_celo.toFixed(4),
      item.unique_voters.toString(),
      item.total_vote_transactions.toString(),
      item.rank.toString()
    ]
    csvRows.push(row.join(','))
  })

  // Create and download
  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Function to export analytics data as JSON
 */
export function exportAnalyticsToJSON(data: DuneProjectAnalytics[], filename = 'analytics.json') {
  if (data.length === 0) return

  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

