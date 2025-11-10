import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/db'

/**
 * Get debug statistics and data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = Number.parseInt(searchParams.get('hours') ?? '24', 10)
    const effectiveHours = Number.isNaN(hours) ? 24 : Math.max(hours, 1)
    const since = new Date(Date.now() - effectiveHours * 60 * 60 * 1000)

    const [
      sdkRequestsCollection,
      sdkInteractionsCollection,
      apiRouteCallsCollection,
      callbackLogsCollection,
    ] = await Promise.all([
      collections.sdkRequests(),
      collections.sdkInteractions(),
      collections.apiRouteCalls(),
      collections.callbackLogs(),
    ])

    // Get counts
    const [sdkRequests, sdkInteractions, apiCalls, callbacks] = await Promise.all([
      sdkRequestsCollection.countDocuments({ timestamp: { $gte: since } }),
      sdkInteractionsCollection.countDocuments({ timestamp: { $gte: since } }),
      apiRouteCallsCollection.countDocuments({ timestamp: { $gte: since } }),
      callbackLogsCollection.countDocuments({ timestamp: { $gte: since } }),
    ])

    // Get SDK request types breakdown
    const sdkRequestTypesCursor = sdkRequestsCollection.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])
    const sdkRequestTypes = await sdkRequestTypesCursor.toArray()

    // Get SDK interaction types breakdown
    const interactionTypesCursor = sdkInteractionsCollection.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])
    const interactionTypes = await interactionTypesCursor.toArray()

    // Get API route breakdown
    const apiRoutesCursor = apiRouteCallsCollection.aggregate<{
      _id: string | null
      count: number
      avgDuration: number | null
    }>([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$route',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
    ])
    const apiRoutes = await apiRoutesCursor.toArray()

    // Get callback types
    const callbackTypesCursor = callbackLogsCollection.aggregate<{
      _id: string | null
      count: number
    }>([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])
    const callbackTypes = await callbackTypesCursor.toArray()

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
        sdkRequestsCollection.countDocuments({
          timestamp: { $gte: hourStart, $lt: hourEnd },
        }),
        sdkInteractionsCollection.countDocuments({
          timestamp: { $gte: hourStart, $lt: hourEnd },
        }),
        apiRouteCallsCollection.countDocuments({
          timestamp: { $gte: hourStart, $lt: hourEnd },
        }),
        callbackLogsCollection.countDocuments({
          timestamp: { $gte: hourStart, $lt: hourEnd },
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
      sdkRequestsCollection.countDocuments({
        timestamp: { $gte: since },
        error: { $ne: null },
      }),
      apiRouteCallsCollection.countDocuments({
        timestamp: { $gte: since },
        statusCode: { $gte: 400 },
      }),
      callbackLogsCollection.countDocuments({
        timestamp: { $gte: since },
        error: { $ne: null },
      }),
    ])

    // Get top domains
    const topDomainsCursor = sdkRequestsCollection.aggregate<{
      _id: string
      count: number
    }>([
      {
        $match: {
          timestamp: { $gte: since },
          domain: { $ne: null },
        },
      },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    const topDomains = await topDomainsCursor.toArray()

    // Get average response times
    const avgResponseTimeCursor = await sdkRequestsCollection
      .aggregate<{ avgDuration: number | null }>([
        {
          $match: {
            timestamp: { $gte: since },
            duration: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
          },
        },
      ])
      .toArray()
    const avgResponseTime = avgResponseTimeCursor[0]?.avgDuration ?? 0

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
        avgResponseTime,
      },
      breakdowns: {
        sdkRequestTypes: sdkRequestTypes.map((group) => ({
          type: group._id ?? 'unknown',
          count: group.count ?? 0,
        })),
        interactionTypes: interactionTypes.map((group) => ({
          type: group._id ?? 'unknown',
          count: group.count ?? 0,
        })),
        apiRoutes: apiRoutes.map((routeGroup) => ({
          route: routeGroup._id ?? 'unknown',
          count: routeGroup.count ?? 0,
          avgDuration: routeGroup.avgDuration ?? 0,
        })),
        callbackTypes: callbackTypes.map((callbackGroup) => ({
          type: callbackGroup._id ?? 'unknown',
          count: callbackGroup.count ?? 0,
        })),
      },
      hourlyData,
      topDomains: topDomains.map((domainGroup) => ({
        domain: domainGroup._id,
        count: domainGroup.count ?? 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching debug stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

