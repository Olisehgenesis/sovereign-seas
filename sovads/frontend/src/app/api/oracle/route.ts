import { NextRequest, NextResponse } from 'next/server'
import { oracle } from '@/lib/oracle'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const status = await oracle.getOracleStatus()
        return NextResponse.json(status)

      case 'balance':
        const publisherWallet = searchParams.get('wallet')
        if (!publisherWallet) {
          return NextResponse.json({
            error: 'Wallet address is required'
          }, { status: 400 })
        }
        
        const balance = await oracle.getPublisherBalance(publisherWallet)
        return NextResponse.json({ balance })

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "status" or "balance"'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in oracle API:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, publisherId, amount, proof } = body

    switch (action) {
      case 'queue-payout':
        if (!publisherId || !amount || !proof) {
          return NextResponse.json({
            error: 'Publisher ID, amount, and proof are required'
          }, { status: 400 })
        }
        
        const payoutKey = await oracle.queuePayout(publisherId, amount, proof)
        return NextResponse.json({
          success: true,
          payoutKey,
          message: 'Payout queued successfully'
        })

      case 'start':
        await oracle.start()
        return NextResponse.json({
          success: true,
          message: 'Oracle started'
        })

      case 'stop':
        await oracle.stop()
        return NextResponse.json({
          success: true,
          message: 'Oracle stopped'
        })

      default:
        return NextResponse.json({
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in oracle API:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}