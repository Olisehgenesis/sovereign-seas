import { NextResponse } from 'next/server'
import { DuneClient } from '@duneanalytics/client-sdk'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY || 'RhOV8GB5STREkHcovMFrRmoklzOrQKTi'
const DUNE_QUERY_ID = 6349526

export async function GET() {
  try {
    const dune = new DuneClient(DUNE_API_KEY)
    const queryResult = await dune.getLatestResult({ queryId: DUNE_QUERY_ID })

    // Handle different possible response structures
    let rows: any[] = []
    if (queryResult.result?.rows) {
      rows = queryResult.result.rows
    } else if (Array.isArray(queryResult.result)) {
      rows = queryResult.result
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from Dune query' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('Error fetching Dune analytics:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch Dune analytics' 
      },
      { status: 500 }
    )
  }
}

