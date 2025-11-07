import { NextRequest, NextResponse } from 'next/server'
import { logSdkRequest, logSdkInteraction, getIpAddress } from '@/lib/debug-logger'
import type { SdkRequestLog, SdkInteractionLog } from '@/lib/debug-logger'

type DebugLogRequestBody =
  | { type: 'SDK_REQUEST'; data: SdkRequestLog }
  | { type: 'SDK_INTERACTION'; data: SdkInteractionLog }

const isDebugLogRequest = (value: unknown): value is DebugLogRequestBody => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as { type?: unknown; data?: unknown }
  return candidate.type === 'SDK_REQUEST' || candidate.type === 'SDK_INTERACTION'
}

/**
 * API endpoint for SDK to log requests and interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!isDebugLogRequest(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

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
    }

    if (type === 'SDK_INTERACTION') {
      await logSdkInteraction({
        ...data,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid log type' }, { status: 400 })
  } catch (error) {
    console.error('Error in debug log endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// CORS headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

