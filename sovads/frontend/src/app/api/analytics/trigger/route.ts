import { NextRequest, NextResponse } from 'next/server'
import { triggerAnalyticsAggregation, triggerPayoutProcessing } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, date, publisherId, amount } = body

    switch (action) {
      case 'aggregate':
        const aggregationResult = await triggerAnalyticsAggregation(date)
        return NextResponse.json({
          success: true,
          message: 'Analytics aggregation completed',
          result: aggregationResult
        })

      case 'payout':
        if (!publisherId || !amount) {
          return NextResponse.json({
            error: 'Publisher ID and amount are required for payout'
          }, { status: 400 })
        }
        
        const payoutResult = await triggerPayoutProcessing(publisherId, amount)
        return NextResponse.json({
          success: true,
          message: 'Payout processing completed',
          result: payoutResult
        })

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "aggregate" or "payout"'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error triggering analytics job:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}