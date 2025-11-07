import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * Get debug statistics and data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = Number.parseInt(searchParams.get('hours') ?? '24', 10)
    const effectiveHours = Number.isNaN(hours) ? 24 : Math.max(hours, 1)
    const since = new Date(Date.now() - effectiveHours * 60 * 60 * 1000)

    // Get counts
    const [sdkRequests, sdkInteractions, apiCalls, callbacks] = await Promise.all([
      prisma.sdkRequest.count({ where: { timestamp: { gte: since } } }),
      prisma.sdkInteraction.count({ where: { timestamp: { gte: since } } }),
      prisma.apiRouteCall.count({ where: { timestamp: { gte: since } } }),
      prisma.callbackLog.count({ where: { timestamp: { gte: since } } }),
    ])

    // Get SDK request types breakdown
    const sdkRequestTypes = await prisma.sdkRequest.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get SDK interaction types breakdown
    const interactionTypes = await prisma.sdkInteraction.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get API route breakdown
    const apiRoutes = await prisma.apiRouteCall.groupBy({
      by: ['route'],
      where: { timestamp: { gte: since } },
      _count: { route: true },
      _avg: { duration: true },
    })

    // Get callback types
    const callbackTypes = await prisma.callbackLog.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get hourly breakdown for charts
    const hourlyData: Array<{
      hour: string
      requests: number
      interactions: number
      api: number
      callbacks: number
    }> = []
    for (let i = effectiveHours - 1; i >= 0; i -= 1) {
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
      
      const [requestCount, interactionCount, apiCount, callbackCount] = await Promise.all([
        prisma.sdkRequest.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        prisma.sdkInteraction.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        prisma.apiRouteCall.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        prisma.callbackLog.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
      ])

      hourlyData.push({
        hour: hourStart.toISOString(),
        requests: requestCount,
        interactions: interactionCount,
        api: apiCount,
        callbacks: callbackCount,
      })
    }

    // Get error rates
    const errorCounts = await Promise.all([
      prisma.sdkRequest.count({
        where: { timestamp: { gte: since }, error: { not: null } },
      }),
      prisma.apiRouteCall.count({
        where: { timestamp: { gte: since }, statusCode: { gte: 400 } },
      }),
      prisma.callbackLog.count({
        where: { timestamp: { gte: since }, error: { not: null } },
      }),
    ])

    // Get top domains
    const topDomains = await prisma.sdkRequest.groupBy({
      by: ['domain'],
      where: { timestamp: { gte: since }, domain: { not: null } },
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 10,
    })

    // Get average response times
    const avgResponseTime = await prisma.sdkRequest.aggregate({
      where: { timestamp: { gte: since }, duration: { not: null } },
      _avg: { duration: true },
    })

    return NextResponse.json({
      summary: {
        sdkRequests,
        sdkInteractions,
        apiCalls,
        callbacks,
        errors: {
          sdkRequests: errorCounts[0],
          apiCalls: errorCounts[1],
          callbacks: errorCounts[2],
        },
        avgResponseTime: avgResponseTime._avg.duration ?? 0,
      },
      breakdowns: {
        sdkRequestTypes: sdkRequestTypes.map((group) => ({
          type: group.type,
          count: group._count?.type ?? 0,
        })),
        interactionTypes: interactionTypes.map((group) => ({
          type: group.type,
          count: group._count?.type ?? 0,
        })),
        apiRoutes: apiRoutes.map((routeGroup) => ({
          route: routeGroup.route,
          count: routeGroup._count.route ?? 0,
          avgDuration: routeGroup._avg.duration ?? 0,
        })),
        callbackTypes: callbackTypes.map((callbackGroup) => ({
          type: callbackGroup.type,
          count: callbackGroup._count.type ?? 0,
        })),
      },
      hourlyData,
      topDomains: topDomains.map((domainGroup) => ({
        domain: domainGroup.domain,
        count: domainGroup._count.domain ?? 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching debug stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

