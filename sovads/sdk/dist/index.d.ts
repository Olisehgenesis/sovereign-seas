export interface SovAdsConfig {
    siteId?: string;
    apiUrl?: string;
    debug?: boolean;
    consumerId?: string;
}
export interface AdComponent {
    id: string;
    campaignId: string;
    bannerUrl: string;
    targetUrl: string;
    description: string;
    consumerId?: string;
}
declare class SovAds {
    protected config: SovAdsConfig;
    private fingerprint;
    private components;
    private siteId;
    private renderObservers;
    private debugLoggingEnabled;
    constructor(config?: SovAdsConfig);
    private generateFingerprint;
    private detectSiteId;
    /**
     * Setup IntersectionObserver to verify ad is actually rendered and visible
     * This helps with fraud prevention and accurate impression tracking
     * Falls back to manual visibility check for older browsers
     */
    setupRenderObserver(element: HTMLElement, adId: string, callback: (isVisible: boolean) => void): void;
    /**
     * Get client metadata for tracking
     */
    private getClientMetadata;
    /**
     * Validate URL format
     */
    private isValidUrl;
    /**
     * Fetch with retry logic
     */
    private fetchWithRetry;
    loadAd(consumerId?: string): Promise<AdComponent | null>;
    /**
     * Track event with retry logic (internal helper)
     */
    private trackEventWithRetry;
    /**
     * Track event with enhanced metadata using Beacon API
     * Includes render verification, IP (collected server-side), and site ID validation
     */
    private trackEvent;
    addComponent(componentId: string, component: any): void;
    getComponent(componentId: string): any;
    removeComponent(componentId: string): void;
    _trackEvent(type: 'IMPRESSION' | 'CLICK', adId: string, campaignId: string, renderInfo?: {
        rendered: boolean;
        viewportVisible: boolean;
        renderTime: number;
    }): Promise<void>;
    /**
     * Get config (for components to access debug mode)
     */
    getConfig(): SovAdsConfig;
    /**
     * Log interaction (public method for components)
     */
    logInteraction(type: string, data: any): Promise<void>;
    /**
     * Log debug event to server
     */
    private logDebug;
    /**
     * Clean up observers when SDK is destroyed
     */
    destroy(): void;
}
export declare class Banner {
    private sovads;
    private containerId;
    private currentAd;
    private renderStartTime;
    private hasTrackedImpression;
    private isRendering;
    constructor(sovads: SovAds, containerId: string);
    render(consumerId?: string): Promise<void>;
}
export declare class Popup {
    private sovads;
    private currentAd;
    private popupElement;
    private isShowing;
    constructor(sovads: SovAds);
    show(consumerId?: string, delay?: number): Promise<void>;
    private renderPopup;
    hide(): void;
}
export declare class Sidebar {
    private sovads;
    private containerId;
    private currentAd;
    private renderStartTime;
    private hasTrackedImpression;
    private isRendering;
    constructor(sovads: SovAds, containerId: string);
    render(consumerId?: string): Promise<void>;
}
export { SovAds };
export default SovAds;
//# sourceMappingURL=index.d.ts.map