import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Get debug statistics and data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get counts
    const [sdkRequests, sdkInteractions, apiCalls, callbacks] = await Promise.all([
      (prisma as any).sdkRequest.count({ where: { timestamp: { gte: since } } }),
      (prisma as any).sdkInteraction.count({ where: { timestamp: { gte: since } } }),
      (prisma as any).apiRouteCall.count({ where: { timestamp: { gte: since } } }),
      (prisma as any).callbackLog.count({ where: { timestamp: { gte: since } } }),
    ])

    // Get SDK request types breakdown
    const sdkRequestTypes = await (prisma as any).sdkRequest.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get SDK interaction types breakdown
    const interactionTypes = await (prisma as any).sdkInteraction.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get API route breakdown
    const apiRoutes = await (prisma as any).apiRouteCall.groupBy({
      by: ['route'],
      where: { timestamp: { gte: since } },
      _count: { route: true },
      _avg: { duration: true },
    })

    // Get callback types
    const callbackTypes = await (prisma as any).callbackLog.groupBy({
      by: ['type'],
      where: { timestamp: { gte: since } },
      _count: { type: true },
    })

    // Get hourly breakdown for charts
    const hourlyData = []
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
      
      const [requests, interactions, api, callback] = await Promise.all([
        (prisma as any).sdkRequest.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        (prisma as any).sdkInteraction.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        (prisma as any).apiRouteCall.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
        (prisma as any).callbackLog.count({
          where: { timestamp: { gte: hourStart, lt: hourEnd } },
        }),
      ])

      hourlyData.push({
        hour: hourStart.toISOString(),
        requests,
        interactions,
        api,
        callbacks,
      })
    }

    // Get error rates
    const errorCounts = await Promise.all([
      (prisma as any).sdkRequest.count({
        where: { timestamp: { gte: since }, error: { not: null } },
      }),
      (prisma as any).apiRouteCall.count({
        where: { timestamp: { gte: since }, statusCode: { gte: 400 } },
      }),
      (prisma as any).callbackLog.count({
        where: { timestamp: { gte: since }, error: { not: null } },
      }),
    ])

    // Get top domains
    const topDomains = await (prisma as any).sdkRequest.groupBy({
      by: ['domain'],
      where: { timestamp: { gte: since }, domain: { not: null } },
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 10,
    })

    // Get average response times
    const avgResponseTime = await (prisma as any).sdkRequest.aggregate({
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
        avgResponseTime: avgResponseTime._avg.duration || 0,
      },
      breakdowns: {
        sdkRequestTypes: sdkRequestTypes.map((r: any) => ({
          type: r.type,
          count: r._count.type,
        })),
        interactionTypes: interactionTypes.map((i: any) => ({
          type: i.type,
          count: i._count.type,
        })),
        apiRoutes: apiRoutes.map((r: any) => ({
          route: r.route,
          count: r._count.route,
          avgDuration: r._avg.duration || 0,
        })),
        callbackTypes: callbackTypes.map((c: any) => ({
          type: c.type,
          count: c._count.type,
        })),
      },
      hourlyData,
      topDomains: topDomains.map((d: any) => ({
        domain: d.domain,
        count: d._count.domain,
      })),
    })
  } catch (error) {
    console.error('Error fetching debug stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

