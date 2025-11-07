'use client'

import { SovAds } from 'sovads-sdk'

let sovAdsClient: SovAds | null = null

const resolveApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://ads.sovseas.xyz'
  }

  return (
    process.env.NEXT_PUBLIC_SOVADS_API_URL ||
    (window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://ads.sovseas.xyz')
  )
}

export const getSovAdsClient = (): SovAds | null => {
  if (typeof window === 'undefined') {
    return null
  }

  if (!sovAdsClient) {
    sovAdsClient = new SovAds({
      apiUrl: resolveApiUrl(),
      debug: process.env.NODE_ENV !== 'production',
    })
  }

  return sovAdsClient
}

export const destroySovAdsClient = (): void => {
  if (sovAdsClient) {
    sovAdsClient.destroy()
    sovAdsClient = null
  }
}

