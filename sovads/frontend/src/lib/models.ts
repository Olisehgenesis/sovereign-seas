export interface Advertiser {
  _id: string
  wallet: string
  name?: string
  email?: string
  company?: string
  subscriptionPlan?: string
  subscriptionActive: boolean
  subscriptionDate?: Date
  totalSpent: number
  createdAt: Date
  updatedAt: Date
}

export interface Publisher {
  _id: string
  wallet: string
  domain: string
  verified: boolean
  totalEarned: number
  createdAt: Date
  updatedAt: Date
}

export interface PublisherSite {
  _id: string
  publisherId: string
  domain: string
  siteId: string
  apiKey: string
  apiSecret: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Campaign {
  _id: string
  advertiserId: string
  name: string
  description?: string
  bannerUrl: string
  targetUrl: string
  budget: number
  spent: number
  cpc: number
  active: boolean
  tokenAddress?: string
  metadataURI?: string
  mediaType: 'image' | 'video'
  tags: string[]
  targetLocations: string[]
  metadata?: Record<string, unknown>
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Event {
  _id: string
  type: 'IMPRESSION' | 'CLICK'
  campaignId: string
  publisherId: string
  siteId?: string
  publisherSiteId?: string
  adId: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  fingerprint?: string
  verified: boolean
}

export interface AnalyticsHash {
  _id: string
  date: Date
  hash: string
  createdAt: Date
}

export interface Asset {
  _id: string
  filename?: string
  contentType: string
  dataBase64: string
  createdAt: Date
}

export interface Payout {
  _id: string
  publisherId: string
  publisherWallet: string
  amount: number
  proof: string
  date: string
  status: 'pending' | 'completed' | 'failed'
  txHash?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface SdkRequest {
  _id: string
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
  timestamp: Date
}

export interface SdkInteraction {
  _id: string
  requestId?: string
  type: string
  adId?: string
  campaignId?: string
  siteId?: string
  pageUrl?: string
  elementType?: string
  metadata?: Record<string, unknown> | null
  timestamp: Date
}

export interface ApiRouteCall {
  _id: string
  route: string
  method: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
  requestBody?: unknown
  responseBody?: unknown
  error?: string
  duration?: number
  timestamp: Date
}

export interface CallbackLog {
  _id: string
  type: string
  endpoint: string
  payload: unknown
  ipAddress?: string
  userAgent?: string
  fingerprint?: string
  statusCode?: number
  error?: string
  timestamp: Date
}

