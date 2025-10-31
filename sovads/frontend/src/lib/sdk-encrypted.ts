/**
 * Encrypted SDK implementation
 * SDK sends encrypted and signed requests to ensure only legitimate SDK calls reach the API
 */

interface SovAdsConfig {
  siteId: string
  containerId: string
  apiKey: string // API key from publisher dashboard
  apiSecret: string // Secret from publisher dashboard (keep secure!)
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

class SovAdsEncryptedSDK {
  private config: SovAdsConfig
  private currentAd: Ad | null = null
  private fingerprint: string

  constructor(config: SovAdsConfig) {
    this.config = {
      apiUrl: 'https://api.sovads.com',
      debug: false,
      ...config
    }
    
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('API key and secret are required for encrypted SDK')
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
      hash = hash & hash
    }
    
    return Math.abs(hash).toString(16)
  }

  private async encryptPayload(payload: string): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Derive key from secret
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.apiSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('sovads-salt-v1'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      secretKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    }
  }

  private async generateSignature(payload: string, timestamp: number): Promise<string> {
    const encoder = new TextEncoder()
    const message = `${timestamp}:${payload}`
    
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(message)
    )
    
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
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
      // For ad loading, we can use unencrypted request since it's public data
      const response = await fetch(`${this.config.apiUrl}/api/ads?siteId=${this.config.siteId}&apiKey=${this.config.apiKey}`)
      
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

    container.innerHTML = ''

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

    const img = document.createElement('img')
    img.src = this.currentAd.bannerUrl
    img.alt = this.currentAd.name
    img.style.cssText = `
      width: 100%;
      height: auto;
      display: block;
    `

    adElement.addEventListener('click', () => {
      this.trackEvent('CLICK')
      window.open(this.currentAd!.targetUrl, '_blank', 'noopener,noreferrer')
    })

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
        fingerprint: this.fingerprint,
        timestamp: Date.now()
      }

      const payloadString = JSON.stringify(payload)
      
      // Encrypt payload
      const { encrypted, iv } = await this.encryptPayload(payloadString)
      
      // Generate signature
      const timestamp = Date.now()
      const signature = await this.generateSignature(payloadString, timestamp)

      const encryptedPayload = {
        apiKey: this.config.apiKey,
        encrypted,
        iv,
        signature,
        timestamp,
        siteId: this.config.siteId // Non-sensitive identifier
      }

      // Use sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(encryptedPayload)], {
          type: 'application/json'
        })
        navigator.sendBeacon(`${this.config.apiUrl}/api/webhook/track`, blob)
      } else {
        // Fallback to fetch
        await fetch(`${this.config.apiUrl}/api/webhook/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(encryptedPayload)
        })
      }

      if (this.config.debug) {
        console.log(`SovAds: Tracked ${type} event (encrypted)`, { type, timestamp })
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Error tracking event:', error)
      }
    }
  }

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

// Export for module usage
export default SovAdsEncryptedSDK
export { SovAdsConfig, Ad }

