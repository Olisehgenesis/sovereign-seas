import { NextRequest, NextResponse } from 'next/server'
import { logSdkRequest, logSdkInteraction, getIpAddress } from '@/lib/debug-logger'

/**
 * API endpoint for SDK to log requests and interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    const ipAddress = getIpAddress(request)
    const userAgent = request.headers.get('user-agent') || undefined

    if (type === 'SDK_REQUEST') {
      const requestId = await logSdkRequest({
        ...data,
        ipAddress,
        userAgent,
      })
      
      return NextResponse.json({ success: true, requestId })
    } else if (type === 'SDK_INTERACTION') {
      await logSdkInteraction({
        ...data,
      })
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in debug log endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// CORS headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

