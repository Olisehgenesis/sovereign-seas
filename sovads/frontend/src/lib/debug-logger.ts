import 'server-only'
import { prisma } from './db'
import { NextRequest } from 'next/server'

const MAX_RESPONSE_LOG_LENGTH = 10_000

const safeStringify = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('Failed to stringify value for debug log:', error)
    return null
  }
}

/**
 * Debug Logger - Tracks all SDK interactions and API calls
 */

export interface SdkRequestLog {
  type: string
  endpoint: string
  method: string
  siteId?: string
  domain?: string
  pageUrl?: string
  userAgent?: string
  ipAddress?: string
  fingerprint?: string
  requestBody?: unknown
  responseStatus?: number
  responseBody?: unknown
  error?: string
  duration?: number
}

export interface SdkInteractionLog {
  requestId?: string
  type: string
  adId?: string
  campaignId?: string
  siteId?: string
  pageUrl?: string
  elementType?: string
  metadata?: Record<string, unknown>
}

export interface ApiRouteCallLog {
  route: string
  method: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
  requestBody?: unknown
  responseBody?: unknown
  error?: string
  duration?: number
}

export interface CallbackLogData {
  type: string
  endpoint: string
  payload: unknown
  ipAddress?: string
  userAgent?: string
  fingerprint?: string
  statusCode?: number
  error?: string
}

/**
 * Extract IP address from request
 */
export function getIpAddress(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip') ||
    undefined
  )
}

/**
 * Log SDK request
 */
export async function logSdkRequest(data: SdkRequestLog): Promise<string> {
  try {
    const request = await prisma.sdkRequest.create({
      data: {
        type: data.type,
        endpoint: data.endpoint,
        method: data.method,
        siteId: data.siteId,
        domain: data.domain,
        pageUrl: data.pageUrl,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        fingerprint: data.fingerprint,
        requestBody: safeStringify(data.requestBody),
        responseStatus: data.responseStatus,
        responseBody: safeStringify(data.responseBody),
        error: data.error,
        duration: data.duration,
      },
    })
    return request.id
  } catch (error) {
    console.error('Error logging SDK request:', error)
    return ''
  }
}

/**
 * Log SDK interaction
 */
export async function logSdkInteraction(data: SdkInteractionLog): Promise<void> {
  try {
    await prisma.sdkInteraction.create({
      data: {
        requestId: data.requestId,
        type: data.type,
        adId: data.adId,
        campaignId: data.campaignId,
        siteId: data.siteId,
        pageUrl: data.pageUrl,
        elementType: data.elementType,
        metadata: safeStringify(data.metadata),
      },
    })
  } catch (error) {
    console.error('Error logging SDK interaction:', error)
  }
}

/**
 * Log API route call
 */
export async function logApiRouteCall(data: ApiRouteCallLog): Promise<void> {
  try {
    const responseBodyString = safeStringify(data.responseBody)
    const truncatedResponseBody =
      responseBodyString && responseBodyString.length > MAX_RESPONSE_LOG_LENGTH
        ? `${responseBodyString.substring(0, MAX_RESPONSE_LOG_LENGTH)}... [truncated]`
        : responseBodyString

    await prisma.apiRouteCall.create({
      data: {
        route: data.route,
        method: data.method,
        statusCode: data.statusCode,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestBody: safeStringify(data.requestBody),
        responseBody: truncatedResponseBody,
        error: data.error,
        duration: data.duration,
      },
    })
  } catch (error) {
    console.error('Error logging API route call:', error)
  }
}

/**
 * Log callback/webhook
 */
export async function logCallback(data: CallbackLogData): Promise<void> {
  try {
    await prisma.callbackLog.create({
      data: {
        type: data.type,
        endpoint: data.endpoint,
        payload: safeStringify(data.payload) ?? '',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        fingerprint: data.fingerprint,
        statusCode: data.statusCode,
        error: data.error,
      },
    })
  } catch (error) {
    console.error('Error logging callback:', error)
  }
}

