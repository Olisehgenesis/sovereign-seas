interface SovAdsConfig {
  siteId: string
  containerId: string
  apiUrl?: string
  debug?: boolean
}

interface Ad {
  id: string
  campaignId: string
  name: string
  bannerUrl: string
  targetUrl: string
  cpc: string
}

class SovAdsSDK {
  private config: SovAdsConfig
  private currentAd: Ad | null = null
  private fingerprint: string

  constructor(config: SovAdsConfig) {
    this.config = {
      apiUrl: 'https://api.sovads.com',
      debug: false,
      ...config
    }
    
    this.fingerprint = this.generateFingerprint()
    this.init()
  }

  private generateFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('SovAds SDK', 10, 10)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16)
  }

  private async init(): Promise<void> {
    try {
      await this.loadAd()
    } catch (error) {
      if (this.config.debug) {
        console.error('SovAds SDK initialization error:', error)
      }
    }
  }

  private async loadAd(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/ads?siteId=${this.config.siteId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ad: ${response.status}`)
      }
      
      this.currentAd = await response.json()
      this.renderAd()
      this.trackEvent('IMPRESSION')
    } catch (error) {
      if (this.config.debug) {
        console.error('Error loading ad:', error)
      }
    }
  }

  private renderAd(): void {
    if (!this.currentAd) return

    const container = document.getElementById(this.config.containerId)
    if (!container) {
      if (this.config.debug) {
        console.error(`Container with ID '${this.config.containerId}' not found`)
      }
      return
    }

    // Clear existing content
    container.innerHTML = ''

    // Create ad element
    const adElement = document.createElement('div')
    adElement.className = 'sovads-ad'
    adElement.style.cssText = `
      display: block;
      max-width: 100%;
      cursor: pointer;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.2s ease;
    `

    // Create image
    const img = document.createElement('img')
    img.src = this.currentAd.bannerUrl
    img.alt = this.currentAd.name
    img.style.cssText = `
      width: 100%;
      height: auto;
      display: block;
    `

    // Add click handler
    adElement.addEventListener('click', () => {
      this.trackEvent('CLICK')
      window.open(this.currentAd!.targetUrl, '_blank', 'noopener,noreferrer')
    })

    // Add hover effect
    adElement.addEventListener('mouseenter', () => {
      adElement.style.transform = 'scale(1.02)'
    })

    adElement.addEventListener('mouseleave', () => {
      adElement.style.transform = 'scale(1)'
    })

    adElement.appendChild(img)
    container.appendChild(adElement)
  }

  private async trackEvent(type: 'IMPRESSION' | 'CLICK'): Promise<void> {
    if (!this.currentAd) return

    try {
      const payload = {
        type,
        campaignId: this.currentAd.campaignId,
        adId: this.currentAd.id,
        siteId: this.config.siteId,
        fingerprint: this.fingerprint
      }

      // Use sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json'
        })
        navigator.sendBeacon(`${this.config.apiUrl}/api/track`, blob)
      } else {
        // Fallback to fetch
        await fetch(`${this.config.apiUrl}/api/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }

      if (this.config.debug) {
        console.log(`SovAds: Tracked ${type} event`, payload)
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Error tracking event:', error)
      }
    }
  }

  // Public methods
  public async refreshAd(): Promise<void> {
    await this.loadAd()
  }

  public getCurrentAd(): Ad | null {
    return this.currentAd
  }

  public destroy(): void {
    const container = document.getElementById(this.config.containerId)
    if (container) {
      container.innerHTML = ''
    }
  }
}

// Global function for easy integration
declare global {
  interface Window {
    SovAds: typeof SovAdsSDK
  }
}

window.SovAds = SovAdsSDK

// Export for module usage
export default SovAdsSDK
export { SovAdsConfig, Ad }
