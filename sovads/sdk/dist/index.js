// SovAds SDK - Modular Ad Network Integration
// Usage: import { SovAds, Banner, Popup, Sidebar } from '@sovads/sdk'
class SovAds {
    constructor(config = {}) {
        this.components = new Map();
        this.siteId = null;
        this.renderObservers = new Map();
        this.debugLoggingEnabled = true;
        this.config = {
            apiUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:3000'
                : 'https://ads.sovseas.xyz',
            debug: false,
            ...config
        };
        this.fingerprint = this.generateFingerprint();
        if (this.config.debug) {
            console.log('SovAds SDK initialized:', this.config);
        }
    }
    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx?.fillText('SovAds fingerprint', 10, 10);
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        return btoa(fingerprint).substring(0, 16);
    }
    async detectSiteId() {
        if (this.siteId) {
            return this.siteId;
        }
        if (this.config.siteId) {
            this.siteId = this.config.siteId;
            if (this.config.debug) {
                console.log('Using configured site ID:', this.siteId);
            }
            return this.siteId;
        }
        try {
            // Send beacon to detect site ID based on domain
            const domain = window.location.hostname;
            const payload = {
                domain,
                fingerprint: this.fingerprint,
                userAgent: navigator.userAgent,
                pageUrl: window.location.href,
                timestamp: Date.now()
            };
            const startTime = Date.now();
            const endpoint = `${this.config.apiUrl}/api/sites/detect`;
            // Send detection request using fetch (beacon doesn't support response)
            const response = await this.fetchWithRetry(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const duration = Date.now() - startTime;
            // Log SDK request
            await this.logDebug('SDK_REQUEST', {
                type: 'SITE_DETECT',
                endpoint: '/api/sites/detect',
                method: 'POST',
                domain,
                pageUrl: window.location.href,
                userAgent: navigator.userAgent,
                fingerprint: this.fingerprint,
                requestBody: payload,
                responseStatus: response.status,
                duration,
            });
            if (response.ok) {
                const data = await response.json();
                if (data.siteId) {
                    this.siteId = String(data.siteId);
                    if (this.config.debug) {
                        console.log('Site ID detected from API:', this.siteId, data);
                    }
                    return this.siteId;
                }
            }
            // Fallback: generate site ID from domain (for development only)
            // In production, this should trigger registration flow
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocalhost) {
                this.siteId = `site_${btoa(domain).substring(0, 8)}`;
                if (this.config.debug) {
                    console.log('Generated fallback site ID (dev mode):', this.siteId);
                }
                return this.siteId;
            }
            else {
                // In production, use temp_ prefix to indicate unregistered site
                this.siteId = `temp_${btoa(domain).substring(0, 8)}_${Date.now()}`;
                if (this.config.debug) {
                    console.warn('Unregistered site detected, using temp site ID:', this.siteId);
                }
                return this.siteId;
            }
        }
        catch (error) {
            if (this.config.debug) {
                console.error('Error detecting site ID:', error);
            }
            // Fallback: generate site ID from domain
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            if (isLocalhost) {
                this.siteId = `site_${btoa(hostname).substring(0, 8)}`;
            }
            else {
                this.siteId = `temp_${btoa(hostname).substring(0, 8)}_${Date.now()}`;
            }
            return this.siteId;
        }
    }
    /**
     * Setup IntersectionObserver to verify ad is actually rendered and visible
     * This helps with fraud prevention and accurate impression tracking
     * Falls back to manual visibility check for older browsers
     */
    setupRenderObserver(element, adId, callback) {
        // Clean up existing observer if any
        const existingObserver = this.renderObservers.get(adId);
        if (existingObserver) {
            existingObserver.disconnect();
        }
        // Check if IntersectionObserver is supported
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.5;
                    callback(isVisible);
                    if (this.config.debug) {
                        console.log(`Ad ${adId} visibility:`, {
                            isIntersecting: entry.isIntersecting,
                            intersectionRatio: entry.intersectionRatio,
                            isVisible
                        });
                    }
                });
            }, {
                threshold: [0.5], // At least 50% visible
                rootMargin: '0px'
            });
            observer.observe(element);
            this.renderObservers.set(adId, observer);
        }
        else {
            // Fallback for older browsers: manual visibility check
            if (this.config.debug) {
                console.warn(`IntersectionObserver not supported, using fallback for ad ${adId}`);
            }
            const checkVisibility = () => {
                const rect = element.getBoundingClientRect();
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                const windowWidth = window.innerWidth || document.documentElement.clientWidth;
                // Check if element is in viewport and at least 50% visible
                const isInViewport = (rect.top < windowHeight &&
                    rect.bottom > 0 &&
                    rect.left < windowWidth &&
                    rect.right > 0);
                if (isInViewport) {
                    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
                    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
                    const visibleArea = visibleHeight * visibleWidth;
                    const totalArea = rect.height * rect.width;
                    const intersectionRatio = totalArea > 0 ? visibleArea / totalArea : 0;
                    const isVisible = intersectionRatio >= 0.5;
                    callback(isVisible);
                }
                else {
                    callback(false);
                }
            };
            // Check immediately and on scroll/resize
            checkVisibility();
            const scrollHandler = () => checkVisibility();
            const resizeHandler = () => checkVisibility();
            window.addEventListener('scroll', scrollHandler, { passive: true });
            window.addEventListener('resize', resizeHandler, { passive: true });
            // Store cleanup function
            this.renderObservers.set(adId, {
                disconnect: () => {
                    window.removeEventListener('scroll', scrollHandler);
                    window.removeEventListener('resize', resizeHandler);
                }
            });
        }
    }
    /**
     * Get client metadata for tracking
     */
    getClientMetadata() {
        return {
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            timezoneOffset: new Date().getTimezoneOffset(),
            referrer: document.referrer || '',
            timestamp: Date.now()
        };
    }
    /**
     * Validate URL format
     */
    isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    /**
     * Fetch with retry logic
     */
    async fetchWithRetry(url, options = {}, maxAttempts = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.ok || attempt === maxAttempts) {
                    return response;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxAttempts) {
                    const delay = Math.pow(2, attempt - 1) * 100; // Exponential backoff
                    if (this.config.debug) {
                        console.warn(`Fetch attempt ${attempt} failed, retrying in ${delay}ms...`);
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('Fetch failed after retries');
    }
    async loadAd(consumerId) {
        const startTime = Date.now();
        try {
            const siteId = await this.detectSiteId();
            const params = new URLSearchParams({
                siteId,
                ...(consumerId && { consumerId })
            });
            const endpoint = `${this.config.apiUrl}/api/ads?${params}`;
            const response = await this.fetchWithRetry(endpoint);
            const duration = Date.now() - startTime;
            // Log SDK request
            await this.logDebug('SDK_REQUEST', {
                type: 'AD_REQUEST',
                endpoint: '/api/ads',
                method: 'GET',
                siteId,
                domain: window.location.hostname,
                pageUrl: window.location.href,
                userAgent: navigator.userAgent,
                fingerprint: this.fingerprint,
                requestBody: { siteId, consumerId },
                responseStatus: response.status,
                duration,
            });
            // Check if site is not registered (403 or 404)
            if (response.status === 403 || response.status === 404) {
                console.log('Site not registered');
                // Return dummy ad for unregistered sites
                return {
                    id: 'dummy_ad_unregistered',
                    campaignId: 'dummy_campaign',
                    bannerUrl: 'https://sovseas.xyz/logo.png', // Placeholder - can be replaced with actual sovseas image
                    targetUrl: 'https://ads.sovseas.xyz/publisher',
                    description: 'Register your site to get ads',
                    isDummy: true
                };
            }
            if (!response.ok) {
                throw new Error(`Failed to load ad: ${response.statusText}`);
            }
            const ad = await response.json();
            // Validate ad data
            if (!ad || !ad.bannerUrl || !ad.targetUrl) {
                if (this.config.debug) {
                    console.error('Invalid ad data received:', ad);
                }
                return null;
            }
            // Validate URLs
            if (!this.isValidUrl(ad.bannerUrl)) {
                if (this.config.debug) {
                    console.error('Invalid bannerUrl:', ad.bannerUrl);
                }
                return null;
            }
            if (!this.isValidUrl(ad.targetUrl)) {
                if (this.config.debug) {
                    console.error('Invalid targetUrl:', ad.targetUrl);
                }
                return null;
            }
            if (this.config.debug) {
                console.log('Ad loaded:', ad);
            }
            // Log interaction
            await this.logDebug('SDK_INTERACTION', {
                type: 'AD_LOADED',
                adId: ad.id,
                campaignId: ad.campaignId,
                siteId,
                pageUrl: window.location.href,
            });
            return ad;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            await this.logDebug('SDK_REQUEST', {
                type: 'AD_REQUEST',
                endpoint: '/api/ads',
                method: 'GET',
                siteId: this.siteId,
                domain: window.location.hostname,
                pageUrl: window.location.href,
                userAgent: navigator.userAgent,
                fingerprint: this.fingerprint,
                error: error instanceof Error ? error.message : String(error),
                duration,
            });
            if (this.config.debug) {
                console.error('Error loading ad:', error);
            }
            return null;
        }
    }
    /**
     * Track event with retry logic (internal helper)
     */
    async trackEventWithRetry(type, adId, campaignId, renderInfo, attempt, maxAttempts = 3) {
        try {
            const siteId = await this.detectSiteId();
            const metadata = this.getClientMetadata();
            const payload = {
                type,
                campaignId,
                adId,
                siteId,
                fingerprint: this.fingerprint,
                consumerId: this.config.consumerId,
                rendered: renderInfo?.rendered ?? true,
                viewportVisible: renderInfo?.viewportVisible ?? false,
                renderTime: renderInfo?.renderTime ?? Date.now(),
                timestamp: metadata.timestamp,
                pageUrl: metadata.pageUrl,
                userAgent: metadata.userAgent
            };
            const webhookUrl = `${this.config.apiUrl}/api/webhook/beacon`;
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                keepalive: true // Similar behavior to beacon
            });
            if (response.ok) {
                if (this.config.debug) {
                    console.log(`SovAds: Tracked ${type} event via fetch (attempt ${attempt})`, payload);
                }
            }
            else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (error) {
            if (attempt < maxAttempts) {
                // Exponential backoff: 100ms, 200ms, 400ms
                const delay = Math.pow(2, attempt - 1) * 100;
                if (this.config.debug) {
                    console.warn(`SovAds: Retrying ${type} event (attempt ${attempt + 1}/${maxAttempts}) after ${delay}ms`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.trackEventWithRetry(type, adId, campaignId, renderInfo, attempt + 1, maxAttempts);
            }
            else {
                if (this.config.debug) {
                    console.error(`SovAds: Failed to track ${type} event after ${maxAttempts} attempts:`, error);
                }
            }
        }
    }
    /**
     * Track event with enhanced metadata using Beacon API
     * Includes render verification, IP (collected server-side), and site ID validation
     */
    async trackEvent(type, adId, campaignId, renderInfo) {
        try {
            const siteId = await this.detectSiteId();
            const metadata = this.getClientMetadata();
            const payload = {
                type,
                campaignId,
                adId,
                siteId,
                fingerprint: this.fingerprint,
                consumerId: this.config.consumerId,
                rendered: renderInfo?.rendered ?? true,
                viewportVisible: renderInfo?.viewportVisible ?? false,
                renderTime: renderInfo?.renderTime ?? Date.now(),
                timestamp: metadata.timestamp,
                pageUrl: metadata.pageUrl,
                userAgent: metadata.userAgent
            };
            // Use sendBeacon for reliable delivery (better for tracking impressions)
            // Beacon API ensures events are sent even if user navigates away
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], {
                    type: 'application/json'
                });
                // Send to dedicated webhook endpoint for beamer interactions
                const webhookUrl = `${this.config.apiUrl}/api/webhook/beacon`;
                const sent = navigator.sendBeacon(webhookUrl, blob);
                if (!sent) {
                    // Beacon failed, fallback to fetch with retry
                    if (this.config.debug) {
                        console.warn(`SovAds: Beacon failed for ${type}, falling back to fetch`);
                    }
                    await this.trackEventWithRetry(type, adId, campaignId, renderInfo, 1);
                }
                else if (this.config.debug) {
                    console.log(`SovAds: Tracked ${type} event via beacon`, {
                        sent,
                        payload: { ...payload, fingerprint: payload.fingerprint.substring(0, 8) + '...' }
                    });
                }
            }
            else {
                // Fallback to fetch for older browsers
                await this.trackEventWithRetry(type, adId, campaignId, renderInfo, 1);
            }
        }
        catch (error) {
            if (this.config.debug) {
                console.error('Error tracking event:', error);
            }
        }
    }
    // Component management
    addComponent(componentId, component) {
        this.components.set(componentId, component);
    }
    getComponent(componentId) {
        return this.components.get(componentId);
    }
    removeComponent(componentId) {
        this.components.delete(componentId);
    }
    // Expose trackEvent for components (internal use only)
    // Note: This is a workaround to access private method from components
    // In production, consider making trackEvent protected or using a different pattern
    _trackEvent(type, adId, campaignId, renderInfo) {
        return this.trackEvent(type, adId, campaignId, renderInfo);
    }
    /**
     * Get config (for components to access debug mode)
     */
    getConfig() {
        return this.config;
    }
    /**
     * Log interaction (public method for components)
     */
    async logInteraction(type, data) {
        await this.logDebug('SDK_INTERACTION', {
            type,
            ...data,
            siteId: this.siteId,
            pageUrl: window.location.href,
        });
    }
    /**
     * Log debug event to server
     */
    async logDebug(type, data) {
        if (!this.debugLoggingEnabled)
            return;
        try {
            const logUrl = `${this.config.apiUrl}/api/debug/log`;
            const payload = { type, data };
            // Use sendBeacon for non-blocking logging
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(logUrl, blob);
            }
            else {
                // Fallback to fetch (fire and forget)
                fetch(logUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true,
                }).catch(() => {
                    // Silently fail - debug logging shouldn't break the app
                });
            }
        }
        catch (error) {
            // Silently fail - debug logging shouldn't break the app
        }
    }
    /**
     * Clean up observers when SDK is destroyed
     */
    destroy() {
        this.renderObservers.forEach((observer) => observer.disconnect());
        this.renderObservers.clear();
    }
}
// Banner Component
export class Banner {
    constructor(sovads, containerId) {
        this.currentAd = null;
        this.renderStartTime = 0;
        this.hasTrackedImpression = false;
        this.isRendering = false;
        this.sovads = sovads;
        this.containerId = containerId;
    }
    async render(consumerId) {
        // Prevent concurrent renders
        if (this.isRendering) {
            if (this.sovads.getConfig().debug) {
                console.warn(`Banner render already in progress for ${this.containerId}`);
            }
            return;
        }
        this.isRendering = true;
        try {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`Container with id "${this.containerId}" not found`);
                this.isRendering = false;
                return;
            }
            this.renderStartTime = Date.now();
            this.currentAd = await this.sovads.loadAd(consumerId);
            if (!this.currentAd) {
                container.innerHTML = '<div class="sovads-no-ad">No ads available</div>';
                this.isRendering = false;
                return;
            }
            // Handle dummy ads for unregistered sites
            if (this.currentAd.isDummy) {
                const dummyElement = document.createElement('div');
                dummyElement.className = 'sovads-banner-dummy';
                dummyElement.setAttribute('data-ad-id', this.currentAd.id);
                dummyElement.style.cssText = `
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          background: #f9f9f9;
          cursor: pointer;
          transition: transform 0.2s ease;
        `;
                const img = document.createElement('img');
                img.src = this.currentAd.bannerUrl;
                img.alt = 'SovSeas';
                img.style.cssText = 'width: 120px; height: auto; margin: 0 auto 12px; display: block;';
                img.onerror = () => {
                    // If image fails to load, create a simple placeholder
                    img.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = 'width: 120px; height: 60px; margin: 0 auto 12px; background: #e0e0e0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;';
                    placeholder.textContent = 'SovSeas';
                    dummyElement.insertBefore(placeholder, dummyElement.firstChild);
                };
                const message = document.createElement('div');
                message.textContent = 'Register your site to get ads';
                message.style.cssText = 'color: #333; font-size: 14px; font-weight: 500; margin-top: 8px;';
                dummyElement.appendChild(img);
                dummyElement.appendChild(message);
                dummyElement.addEventListener('click', () => {
                    window.open(this.currentAd.targetUrl, '_blank', 'noopener,noreferrer');
                });
                dummyElement.addEventListener('mouseenter', () => {
                    dummyElement.style.transform = 'scale(1.02)';
                    dummyElement.style.background = '#f0f0f0';
                });
                dummyElement.addEventListener('mouseleave', () => {
                    dummyElement.style.transform = 'scale(1)';
                    dummyElement.style.background = '#f9f9f9';
                });
                container.appendChild(dummyElement);
                this.isRendering = false;
                return;
            }
            const adElement = document.createElement('div');
            adElement.className = 'sovads-banner';
            adElement.setAttribute('data-ad-id', this.currentAd.id);
            adElement.style.cssText = `
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
            const img = document.createElement('img');
            img.src = this.currentAd.bannerUrl;
            img.alt = this.currentAd.description;
            img.style.cssText = 'width: 100%; height: auto; display: block;';
            // Track when image loads (render verification)
            img.onload = () => {
                const renderTime = Date.now() - this.renderStartTime;
                const renderInfo = {
                    rendered: true,
                    viewportVisible: false,
                    renderTime
                };
                // Setup IntersectionObserver to verify ad is visible
                this.sovads.setupRenderObserver(adElement, this.currentAd.id, (isVisible) => {
                    renderInfo.viewportVisible = isVisible;
                    // Track impression only once when ad becomes visible
                    if (isVisible && !this.hasTrackedImpression) {
                        this.hasTrackedImpression = true;
                        this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, renderInfo);
                    }
                });
            };
            // Handle image load errors - still track impression if element is visible
            img.onerror = () => {
                if (this.sovads.getConfig().debug) {
                    console.warn(`Failed to load ad image: ${this.currentAd.bannerUrl}`);
                }
                // Still set up observer in case element becomes visible (for broken image tracking)
                const renderInfo = {
                    rendered: false,
                    viewportVisible: false,
                    renderTime: Date.now() - this.renderStartTime
                };
                this.sovads.setupRenderObserver(adElement, this.currentAd.id, (isVisible) => {
                    renderInfo.viewportVisible = isVisible;
                    // Track impression even with broken image if visible
                    if (isVisible && !this.hasTrackedImpression) {
                        this.hasTrackedImpression = true;
                        this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, renderInfo);
                    }
                });
            };
            // Add click handler
            adElement.addEventListener('click', () => {
                this.sovads._trackEvent('CLICK', this.currentAd.id, this.currentAd.campaignId, {
                    rendered: true,
                    viewportVisible: true,
                    renderTime: Date.now() - this.renderStartTime
                });
                // Log interaction
                this.sovads.logInteraction('CLICK', {
                    adId: this.currentAd.id,
                    campaignId: this.currentAd.campaignId,
                    elementType: 'BANNER',
                    metadata: { renderTime: Date.now() - this.renderStartTime },
                });
                window.open(this.currentAd.targetUrl, '_blank', 'noopener,noreferrer');
            });
            // Add hover effect
            adElement.addEventListener('mouseenter', () => {
                adElement.style.transform = 'scale(1.02)';
            });
            adElement.addEventListener('mouseleave', () => {
                adElement.style.transform = 'scale(1)';
            });
            adElement.appendChild(img);
            container.appendChild(adElement);
        }
        finally {
            this.isRendering = false;
        }
    }
}
// Popup Component
export class Popup {
    constructor(sovads) {
        this.currentAd = null;
        this.popupElement = null;
        this.isShowing = false;
        this.sovads = sovads;
    }
    async show(consumerId, delay = 3000) {
        // Prevent concurrent shows
        if (this.isShowing) {
            if (this.sovads.getConfig().debug) {
                console.warn('Popup show already in progress');
            }
            return;
        }
        this.isShowing = true;
        this.currentAd = await this.sovads.loadAd(consumerId);
        if (!this.currentAd) {
            console.log('No popup ad available');
            this.isShowing = false;
            return;
        }
        // Show popup after delay
        setTimeout(() => {
            this.renderPopup();
            this.isShowing = false;
        }, delay);
    }
    renderPopup() {
        if (!this.currentAd)
            return;
        const renderStartTime = Date.now();
        // Don't track impressions for dummy ads
        if (!this.currentAd.isDummy) {
            // Track impression immediately when popup is rendered (not waiting for image load)
            // This ensures impression is tracked even if user closes popup quickly
            this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, {
                rendered: true,
                viewportVisible: true,
                renderTime: 0 // Will be updated when image loads
            });
            // Log interaction
            this.sovads.logInteraction('IMPRESSION', {
                adId: this.currentAd.id,
                campaignId: this.currentAd.campaignId,
                elementType: 'POPUP',
                metadata: { renderTime: 0 },
            });
        }
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sovads-popup-overlay';
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
    `;
        // Create popup
        this.popupElement = document.createElement('div');
        this.popupElement.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-width: 400px;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    `;
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        // Handle dummy ads
        if (this.currentAd.isDummy) {
            const dummyContent = document.createElement('div');
            dummyContent.style.cssText = 'text-align: center; padding: 20px;';
            const img = document.createElement('img');
            img.src = this.currentAd.bannerUrl;
            img.alt = 'SovSeas';
            img.style.cssText = 'width: 150px; height: auto; margin: 0 auto 20px; display: block;';
            img.onerror = () => {
                // If image fails to load, create a simple placeholder
                img.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.style.cssText = 'width: 150px; height: 75px; margin: 0 auto 20px; background: #e0e0e0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666;';
                placeholder.textContent = 'SovSeas';
                dummyContent.insertBefore(placeholder, dummyContent.firstChild);
            };
            const message = document.createElement('div');
            message.textContent = 'Register your site to get ads';
            message.style.cssText = 'color: #333; font-size: 16px; font-weight: 500; margin-bottom: 16px;';
            const link = document.createElement('a');
            link.href = this.currentAd.targetUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Register Now';
            link.style.cssText = 'display: inline-block; padding: 10px 20px; background: #007bff; color: white; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;';
            dummyContent.appendChild(img);
            dummyContent.appendChild(message);
            dummyContent.appendChild(link);
            this.popupElement.appendChild(closeBtn);
            this.popupElement.appendChild(dummyContent);
            overlay.appendChild(this.popupElement);
            document.body.appendChild(overlay);
            // Auto close after 10 seconds
            setTimeout(() => {
                this.hide();
            }, 10000);
            return;
        }
        // Ad image
        const img = document.createElement('img');
        img.src = this.currentAd.bannerUrl;
        img.alt = this.currentAd.description;
        img.style.cssText = 'width: 100%; height: auto; border-radius: 8px; cursor: pointer;';
        // Image load tracking (impression already tracked above)
        img.onload = () => {
            const renderTime = Date.now() - renderStartTime;
            if (this.sovads.getConfig().debug) {
                console.log(`Popup ad image loaded in ${renderTime}ms`);
            }
        };
        // Handle image load errors - still track impression for popup
        img.onerror = () => {
            if (this.sovads.getConfig().debug) {
                console.warn(`Failed to load popup ad image: ${this.currentAd.bannerUrl}`);
            }
            // Popup is visible even if image fails, so track impression
            const renderTime = Date.now() - renderStartTime;
            this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, {
                rendered: false,
                viewportVisible: true,
                renderTime
            });
        };
        img.addEventListener('click', () => {
            this.sovads._trackEvent('CLICK', this.currentAd.id, this.currentAd.campaignId, {
                rendered: true,
                viewportVisible: true,
                renderTime: Date.now() - renderStartTime
            });
            // Log interaction
            this.sovads.logInteraction('CLICK', {
                adId: this.currentAd.id,
                campaignId: this.currentAd.campaignId,
                elementType: 'POPUP',
                metadata: { renderTime: Date.now() - renderStartTime },
            });
            window.open(this.currentAd.targetUrl, '_blank', 'noopener,noreferrer');
            this.hide();
        });
        this.popupElement.appendChild(closeBtn);
        this.popupElement.appendChild(img);
        overlay.appendChild(this.popupElement);
        document.body.appendChild(overlay);
        // Auto close after 10 seconds
        setTimeout(() => {
            this.hide();
        }, 10000);
    }
    hide() {
        const overlay = document.querySelector('.sovads-popup-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}
// Sidebar Component
export class Sidebar {
    constructor(sovads, containerId) {
        this.currentAd = null;
        this.renderStartTime = 0;
        this.hasTrackedImpression = false;
        this.isRendering = false;
        this.sovads = sovads;
        this.containerId = containerId;
    }
    async render(consumerId) {
        // Prevent concurrent renders
        if (this.isRendering) {
            if (this.sovads.getConfig().debug) {
                console.warn(`Sidebar render already in progress for ${this.containerId}`);
            }
            return;
        }
        this.isRendering = true;
        try {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`Container with id "${this.containerId}" not found`);
                this.isRendering = false;
                return;
            }
            this.renderStartTime = Date.now();
            this.currentAd = await this.sovads.loadAd(consumerId);
            if (!this.currentAd) {
                container.innerHTML = '<div class="sovads-no-ad">No ads available</div>';
                this.isRendering = false;
                return;
            }
            // Handle dummy ads for unregistered sites
            if (this.currentAd.isDummy) {
                const dummyElement = document.createElement('div');
                dummyElement.className = 'sovads-sidebar-dummy';
                dummyElement.setAttribute('data-ad-id', this.currentAd.id);
                dummyElement.style.cssText = `
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        `;
                const img = document.createElement('img');
                img.src = this.currentAd.bannerUrl;
                img.alt = 'SovSeas';
                img.style.cssText = 'width: 100px; height: auto; margin: 0 auto 12px; display: block;';
                img.onerror = () => {
                    // If image fails to load, create a simple placeholder
                    img.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = 'width: 100px; height: 50px; margin: 0 auto 12px; background: #e0e0e0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666;';
                    placeholder.textContent = 'SovSeas';
                    dummyElement.insertBefore(placeholder, dummyElement.firstChild);
                };
                const message = document.createElement('div');
                message.textContent = 'Register your site to get ads';
                message.style.cssText = 'color: #333; font-size: 13px; font-weight: 500; margin-top: 8px;';
                dummyElement.appendChild(img);
                dummyElement.appendChild(message);
                dummyElement.addEventListener('click', () => {
                    window.open(this.currentAd.targetUrl, '_blank', 'noopener,noreferrer');
                });
                dummyElement.addEventListener('mouseenter', () => {
                    dummyElement.style.background = '#f0f0f0';
                    dummyElement.style.transform = 'translateY(-2px)';
                });
                dummyElement.addEventListener('mouseleave', () => {
                    dummyElement.style.background = '#f9f9f9';
                    dummyElement.style.transform = 'translateY(0)';
                });
                container.appendChild(dummyElement);
                this.isRendering = false;
                return;
            }
            const adElement = document.createElement('div');
            adElement.className = 'sovads-sidebar';
            adElement.setAttribute('data-ad-id', this.currentAd.id);
            adElement.style.cssText = `
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
            const img = document.createElement('img');
            img.src = this.currentAd.bannerUrl;
            img.alt = this.currentAd.description;
            img.style.cssText = 'width: 100%; height: auto; display: block; border-radius: 4px;';
            // Track when image loads (render verification)
            img.onload = () => {
                const renderTime = Date.now() - this.renderStartTime;
                const renderInfo = {
                    rendered: true,
                    viewportVisible: false,
                    renderTime
                };
                // Setup IntersectionObserver to verify ad is visible
                this.sovads.setupRenderObserver(adElement, this.currentAd.id, (isVisible) => {
                    renderInfo.viewportVisible = isVisible;
                    // Track impression only once when ad becomes visible
                    if (isVisible && !this.hasTrackedImpression) {
                        this.hasTrackedImpression = true;
                        this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, renderInfo);
                    }
                });
            };
            // Handle image load errors - still track impression if element is visible
            img.onerror = () => {
                if (this.sovads.getConfig().debug) {
                    console.warn(`Failed to load sidebar ad image: ${this.currentAd.bannerUrl}`);
                }
                // Still set up observer in case element becomes visible (for broken image tracking)
                const renderInfo = {
                    rendered: false,
                    viewportVisible: false,
                    renderTime: Date.now() - this.renderStartTime
                };
                this.sovads.setupRenderObserver(adElement, this.currentAd.id, (isVisible) => {
                    renderInfo.viewportVisible = isVisible;
                    // Track impression even with broken image if visible
                    if (isVisible && !this.hasTrackedImpression) {
                        this.hasTrackedImpression = true;
                        this.sovads._trackEvent('IMPRESSION', this.currentAd.id, this.currentAd.campaignId, renderInfo);
                    }
                });
            };
            // Add click handler
            adElement.addEventListener('click', () => {
                this.sovads._trackEvent('CLICK', this.currentAd.id, this.currentAd.campaignId, {
                    rendered: true,
                    viewportVisible: true,
                    renderTime: Date.now() - this.renderStartTime
                });
                // Log interaction
                this.sovads.logInteraction('CLICK', {
                    adId: this.currentAd.id,
                    campaignId: this.currentAd.campaignId,
                    elementType: 'SIDEBAR',
                    metadata: { renderTime: Date.now() - this.renderStartTime },
                });
                window.open(this.currentAd.targetUrl, '_blank', 'noopener,noreferrer');
            });
            // Add hover effect
            adElement.addEventListener('mouseenter', () => {
                adElement.style.background = '#e9ecef';
                adElement.style.transform = 'translateY(-2px)';
            });
            adElement.addEventListener('mouseleave', () => {
                adElement.style.background = '#f8f9fa';
                adElement.style.transform = 'translateY(0)';
            });
            adElement.appendChild(img);
            container.appendChild(adElement);
        }
        finally {
            this.isRendering = false;
        }
    }
}
// Export main SovAds class
export { SovAds };
// Default export for easy importing
export default SovAds;
//# sourceMappingURL=index.js.map