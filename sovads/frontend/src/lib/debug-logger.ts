import 'server-only'
import { prisma } from './db'
import { NextRequest } from 'next/server'

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
  requestBody?: any
  responseStatus?: number
  responseBody?: any
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
  metadata?: any
}

export interface ApiRouteCallLog {
  route: string
  method: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
  requestBody?: any
  responseBody?: any
  error?: string
  duration?: number
}

export interface CallbackLogData {
  type: string
  endpoint: string
  payload: any
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
    const request = await (prisma as any).sdkRequest.create({
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
        requestBody: data.requestBody ? JSON.stringify(data.requestBody) : null,
        responseStatus: data.responseStatus,
        responseBody: data.responseBody ? JSON.stringify(data.responseBody) : null,
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
    await (prisma as any).sdkInteraction.create({
      data: {
        requestId: data.requestId,
        type: data.type,
        adId: data.adId,
        campaignId: data.campaignId,
        siteId: data.siteId,
        pageUrl: data.pageUrl,
        elementType: data.elementType,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
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
    // Truncate response body if too long (max 10KB)
    let responseBody = data.responseBody
    if (responseBody && typeof responseBody === 'string' && responseBody.length > 10000) {
      responseBody = responseBody.substring(0, 10000) + '... [truncated]'
    } else if (responseBody && typeof responseBody === 'object') {
      const str = JSON.stringify(responseBody)
      if (str.length > 10000) {
        responseBody = str.substring(0, 10000) + '... [truncated]'
      } else {
        responseBody = str
      }
    }

    await (prisma as any).apiRouteCall.create({
      data: {
        route: data.route,
        method: data.method,
        statusCode: data.statusCode,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestBody: data.requestBody ? JSON.stringify(data.requestBody) : null,
        responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
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
    await (prisma as any).callbackLog.create({
      data: {
        type: data.type,
        endpoint: data.endpoint,
        payload: JSON.stringify(data.payload),
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

