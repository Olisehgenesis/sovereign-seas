# Beacon API Tracking Implementation

## Overview

Enhanced SDK and webhook implementation for tracking ad impressions and clicks using the Beacon API with improved fraud prevention and tracking accuracy.

## Key Features

### ✅ SDK Enhancements (`sovads/sdk/index.ts`)

1. **Beacon API Integration**
   - Uses `navigator.sendBeacon()` for reliable event delivery
   - Falls back to `fetch()` with `keepalive: true` for older browsers
   - Ensures events are sent even when users navigate away

2. **Render Verification**
   - Uses `IntersectionObserver` to verify ads are actually visible
   - Tracks when ads are at least 50% visible in viewport
   - Measures render time (time from load to visibility)
   - Only counts impressions when ad is actually rendered and visible

3. **Site ID Validation**
   - Improved site ID detection from API
   - Automatic fallback for development
   - Validates site ID format before tracking

4. **Enhanced Metadata Collection**
   - Client-side metadata (page URL, user agent, viewport size, etc.)
   - Render information (rendered, viewportVisible, renderTime)
   - Fingerprinting for fraud prevention
   - All metadata sent via Beacon API

5. **Development Support**
   - Automatically uses `http://localhost:3000` when on localhost
   - Debug mode for detailed logging
   - Fallback site IDs for testing

### ✅ Webhook Endpoint (`frontend/src/app/api/webhook/beacon/route.ts`)

1. **Dedicated Beacon Endpoint**
   - New endpoint: `/api/webhook/beacon`
   - Optimized for Beacon API requests
   - Handles Blob payloads from `navigator.sendBeacon()`

2. **Server-Side IP Detection**
   - Extracts IP from multiple header sources:
     - `x-forwarded-for` (proxies/load balancers)
     - `x-real-ip`
     - `cf-connecting-ip` (Cloudflare)
     - `x-client-ip`
   - Better accuracy than client-side detection

3. **Site ID Validation**
   - Validates against `PublisherSite` table (new structure)
   - Falls back to legacy `Publisher` structure
   - Development mode allows temporary site IDs
   - Proper error messages for invalid sites

4. **Render Verification Checking**
   - Validates that ads were actually rendered
   - Checks viewport visibility status
   - Marks events as `verified` based on render data
   - Logs warnings for unverified renders

5. **Enhanced Fraud Prevention**
   - Duplicate event detection (1 hour window)
   - Rate limiting (100 events/hour per campaign per site)
   - IP address tracking
   - Fingerprint validation
   - Render verification

## Usage

### SDK Initialization

```typescript
import { SovAds, Banner } from '@sovads/sdk'

// Initialize SDK (auto-detects localhost:3000 in development)
const sovads = new SovAds({
  siteId: 'your-site-id', // Optional - will be auto-detected
  apiUrl: 'http://localhost:3000', // Optional - auto-detected for localhost
  debug: true // Enable debug logging
})

// Create banner component
const banner = new Banner(sovads, 'ad-container')

// Render ad
await banner.render()
```

### Tracking Flow

```
1. SDK loads ad from /api/ads
   ↓
2. Ad renders in container
   ↓
3. Image loads → IntersectionObserver setup
   ↓
4. Ad becomes visible (>50% in viewport)
   ↓
5. SDK tracks IMPRESSION via Beacon API
   → POST /api/webhook/beacon
   ↓
6. User clicks ad
   ↓
7. SDK tracks CLICK via Beacon API
   → POST /api/webhook/beacon
```

### Webhook Payload

```typescript
{
  type: 'IMPRESSION' | 'CLICK',
  campaignId: string,
  adId: string,
  siteId: string,
  fingerprint: string,
  consumerId?: string,
  rendered: boolean,           // Ad was rendered
  viewportVisible: boolean,    // Ad is visible in viewport
  renderTime: number,          // Time to render (ms)
  timestamp: number,
  pageUrl: string,
  userAgent: string
}
```

### Webhook Response

```typescript
{
  success: true,
  eventId: string,
  metadata: {
    ipAddress: string,
    renderVerified: boolean,
    viewportVisible: boolean | null,
    renderTime: number | null
  }
}
```

## Benefits

1. **Better Impression Tracking**
   - Only counts impressions when ads are actually visible
   - Reduces fraud from hidden ads
   - More accurate analytics

2. **Reliable Delivery**
   - Beacon API ensures events are sent even on page unload
   - No blocking of page navigation
   - Better user experience

3. **Enhanced Fraud Prevention**
   - Server-side IP detection (more accurate)
   - Render verification
   - Duplicate detection
   - Rate limiting

4. **Development Friendly**
   - Works seamlessly with localhost:3000
   - Debug mode for troubleshooting
   - Flexible site ID validation

## Configuration

### Environment Variables

No special configuration needed. The SDK automatically:
- Detects `localhost` and uses `http://localhost:3000`
- Falls back to `https://api.sovads.com` in production

### Prisma Schema

The webhook uses the existing schema:
- `PublisherSite` table for site validation
- `Event` table for storing tracking data
- `publisherSiteId` field for linking events to sites

**Note:** If you get TypeScript errors about `publisherSiteId`, run:
```bash
cd sovads/frontend
pnpm db:generate
```

## Testing

1. Start the frontend:
   ```bash
   cd sovads/frontend
   pnpm dev
   ```

2. Use SDK in a test page:
   ```html
   <div id="ad-container"></div>
   <script>
     import { SovAds, Banner } from '@sovads/sdk'
     const sovads = new SovAds({ debug: true })
     const banner = new Banner(sovads, 'ad-container')
     banner.render()
   </script>
   ```

3. Check browser console for debug logs
4. Verify events in database or check webhook logs

## Future Enhancements

- [ ] Add render time analytics dashboard
- [ ] Implement viewability score calculation
- [ ] Add A/B testing for render thresholds
- [ ] Implement client-side IP detection fallback
- [ ] Add real-time analytics stream

