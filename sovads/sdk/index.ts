// SovAds SDK - Modular Ad Network Integration
// Usage: import { SovAds, Banner, Popup, Sidebar } from '@sovads/sdk'

export interface SovAdsConfig {
  siteId?: string // Optional - will be auto-detected if not provided
  apiUrl?: string
  debug?: boolean
  consumerId?: string // For targeting specific advertisers
}

export interface AdComponent {
  id: string
  campaignId: string
  bannerUrl: string
  targetUrl: string
  description: string
  consumerId?: string
}

class SovAds {
  private config: SovAdsConfig
  private fingerprint: string
  private components: Map<string, any> = new Map()
  private siteId: string | null = null

  constructor(config: SovAdsConfig = {}) {
    this.config = {
      apiUrl: 'https://api.sovads.com',
      debug: false,
      ...config
    }
    
    this.fingerprint = this.generateFingerprint()
    
    if (this.config.debug) {
      console.log('SovAds SDK initialized:', this.config)
    }
  }

  private generateFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('SovAds fingerprint', 10, 10)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    return btoa(fingerprint).substring(0, 16)
  }

  private async detectSiteId(): Promise<string> {
    if (this.siteId) {
      return this.siteId
    }

    if (this.config.siteId) {
      this.siteId = this.config.siteId
      return this.siteId
    }

    try {
      // Send beacon to detect site ID based on domain
      const domain = window.location.hostname
      const payload = {
        domain,
        fingerprint: this.fingerprint,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }

      // Use beacon to detect site ID
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json'
        })
        
        // Send detection request
        const response = await fetch(`${this.config.apiUrl}/api/sites/detect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const data = await response.json()
          this.siteId = data.siteId
          
          if (this.config.debug) {
            console.log('Site ID detected:', this.siteId)
          }
          
          return this.siteId
        }
      }

      // Fallback: generate site ID from domain
      this.siteId = `site_${btoa(domain).substring(0, 8)}`
      
      if (this.config.debug) {
        console.log('Generated site ID:', this.siteId)
      }
      
      return this.siteId
    } catch (error) {
      if (this.config.debug) {
        console.error('Error detecting site ID:', error)
      }
      
      // Fallback: generate site ID from domain
      this.siteId = `site_${btoa(window.location.hostname).substring(0, 8)}`
      return this.siteId
    }
  }

  async loadAd(consumerId?: string): Promise<AdComponent | null> {
    try {
      const siteId = await this.detectSiteId()
      
      const params = new URLSearchParams({
        siteId,
        ...(consumerId && { consumerId })
      })

      const response = await fetch(`${this.config.apiUrl}/api/ads?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ad: ${response.statusText}`)
      }

      const ad = await response.json()
      
      if (this.config.debug) {
        console.log('Ad loaded:', ad)
      }

      return ad
    } catch (error) {
      if (this.config.debug) {
        console.error('Error loading ad:', error)
      }
      return null
    }
  }

  private async trackEvent(type: 'IMPRESSION' | 'CLICK', adId: string, campaignId: string): Promise<void> {
    try {
      const siteId = await this.detectSiteId()
      
      const payload = {
        type,
        campaignId,
        adId,
        siteId,
        fingerprint: this.fingerprint,
        consumerId: this.config.consumerId
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

  // Component management
  addComponent(componentId: string, component: any) {
    this.components.set(componentId, component)
  }

  getComponent(componentId: string) {
    return this.components.get(componentId)
  }

  removeComponent(componentId: string) {
    this.components.delete(componentId)
  }

  // Expose trackEvent for components
  trackEvent(type: 'IMPRESSION' | 'CLICK', adId: string, campaignId: string) {
    return this.trackEvent(type, adId, campaignId)
  }
}

// Banner Component
export class Banner {
  private sovads: SovAds
  private containerId: string
  private currentAd: AdComponent | null = null

  constructor(sovads: SovAds, containerId: string) {
    this.sovads = sovads
    this.containerId = containerId
  }

  async render(consumerId?: string) {
    const container = document.getElementById(this.containerId)
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`)
      return
    }

    this.currentAd = await this.sovads.loadAd(consumerId)
    
    if (!this.currentAd) {
      container.innerHTML = '<div class="sovads-no-ad">No ads available</div>'
      return
    }

    const adElement = document.createElement('div')
    adElement.className = 'sovads-banner'
    adElement.style.cssText = `
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s ease;
    `

    const img = document.createElement('img')
    img.src = this.currentAd.bannerUrl
    img.alt = this.currentAd.description
    img.style.cssText = 'width: 100%; height: auto; display: block;'

    // Add click handler
    adElement.addEventListener('click', () => {
      this.sovads.trackEvent('CLICK', this.currentAd!.id, this.currentAd!.campaignId)
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

    // Track impression
    this.sovads.trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId)
  }
}

// Popup Component
export class Popup {
  private sovads: SovAds
  private currentAd: AdComponent | null = null
  private popupElement: HTMLElement | null = null

  constructor(sovads: SovAds) {
    this.sovads = sovads
  }

  async show(consumerId?: string, delay: number = 3000) {
    this.currentAd = await this.sovads.loadAd(consumerId)
    
    if (!this.currentAd) {
      console.log('No popup ad available')
      return
    }

    // Show popup after delay
    setTimeout(() => {
      this.renderPopup()
    }, delay)
  }

  private renderPopup() {
    if (!this.currentAd) return

    // Create overlay
    const overlay = document.createElement('div')
    overlay.className = 'sovads-popup-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    // Create popup
    this.popupElement = document.createElement('div')
    this.popupElement.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-width: 400px;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `

    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.innerHTML = '×'
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    `

    closeBtn.addEventListener('click', () => {
      this.hide()
    })

    // Ad image
    const img = document.createElement('img')
    img.src = this.currentAd.bannerUrl
    img.alt = this.currentAd.description
    img.style.cssText = 'width: 100%; height: auto; border-radius: 8px; cursor: pointer;'

    img.addEventListener('click', () => {
      this.sovads.trackEvent('CLICK', this.currentAd!.id, this.currentAd!.campaignId)
      window.open(this.currentAd!.targetUrl, '_blank', 'noopener,noreferrer')
      this.hide()
    })

    this.popupElement.appendChild(closeBtn)
    this.popupElement.appendChild(img)
    overlay.appendChild(this.popupElement)
    document.body.appendChild(overlay)

    // Track impression
    this.sovads.trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId)

    // Auto close after 10 seconds
    setTimeout(() => {
      this.hide()
    }, 10000)
  }

  hide() {
    const overlay = document.querySelector('.sovads-popup-overlay')
    if (overlay) {
      overlay.remove()
    }
  }
}

// Sidebar Component
export class Sidebar {
  private sovads: SovAds
  private containerId: string
  private currentAd: AdComponent | null = null

  constructor(sovads: SovAds, containerId: string) {
    this.sovads = sovads
    this.containerId = containerId
  }

  async render(consumerId?: string) {
    const container = document.getElementById(this.containerId)
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`)
      return
    }

    this.currentAd = await this.sovads.loadAd(consumerId)
    
    if (!this.currentAd) {
      container.innerHTML = '<div class="sovads-no-ad">No ads available</div>'
      return
    }

    const adElement = document.createElement('div')
    adElement.className = 'sovads-sidebar'
    adElement.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      cursor: pointer;
      transition: all 0.2s ease;
    `

    const img = document.createElement('img')
    img.src = this.currentAd.bannerUrl
    img.alt = this.currentAd.description
    img.style.cssText = 'width: 100%; height: auto; display: block; border-radius: 4px;'

    // Add click handler
    adElement.addEventListener('click', () => {
      this.sovads.trackEvent('CLICK', this.currentAd!.id, this.currentAd!.campaignId)
      window.open(this.currentAd!.targetUrl, '_blank', 'noopener,noreferrer')
    })

    // Add hover effect
    adElement.addEventListener('mouseenter', () => {
      adElement.style.background = '#e9ecef'
      adElement.style.transform = 'translateY(-2px)'
    })

    adElement.addEventListener('mouseleave', () => {
      adElement.style.background = '#f8f9fa'
      adElement.style.transform = 'translateY(0)'
    })

    adElement.appendChild(img)
    container.appendChild(adElement)

    // Track impression
    this.sovads.trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId)
  }
}

// Export main SovAds class
export { SovAds }

// Default export for easy importing
export default SovAds