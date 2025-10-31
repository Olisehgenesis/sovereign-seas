# SovAds System - Beacon API & Import Configuration

## 📡 Beacon API Implementation

The SovAds system uses the **Beacon API** for reliable event tracking, particularly important for analytics that need to work even when users navigate away from pages.

### Implementation Details

**Location**: `/sdk/index.ts` - `trackEvent()` method

```typescript
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
  } catch (error) {
    // Error handling
  }
}
```

### Why Beacon API?

1. **Reliable Delivery** - Works even when page is closing/unloading
2. **Non-blocking** - Doesn't delay page navigation or user interactions
3. **Fire-and-forget** - Perfect for analytics tracking
4. **Browser Support** - Graceful fallback to fetch API
5. **Performance** - Doesn't block the main thread

### Event Types Tracked

- **IMPRESSION** - When an ad is displayed
- **CLICK** - When a user clicks on an ad

Both events use the Beacon API for reliable delivery to the `/api/track` endpoint.

## 📁 Import Configuration (@ Aliases)

The system is configured to use `@` imports for cleaner module resolution.

### Configuration

**File**: `/frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Usage Examples

All files use the `@` alias for imports:

```typescript
// Database and utilities
import { prisma, redis } from '@/lib/db'
import { oracle } from '@/lib/oracle'
import { initializeAnalytics } from '@/lib/analytics'

// API routes
import { NextRequest, NextResponse } from 'next/server'

// External packages
import { EventType } from '@prisma/client'
import { Queue, Worker } from 'bullmq'
```

### Benefits of @ Imports

1. **Cleaner Code** - No more `../../../` relative paths
2. **Easier Refactoring** - Moving files doesn't break imports
3. **Better IDE Support** - Auto-completion and navigation
4. **Consistent Structure** - All imports follow the same pattern

## 🔄 Event Flow with Beacon API

```
1. User loads page with SovAds SDK
   ↓
2. SDK loads ad from /api/ads
   ↓
3. Ad renders and tracks IMPRESSION via Beacon API
   ↓
4. User clicks ad
   ↓
5. SDK tracks CLICK via Beacon API
   ↓
6. User navigates away (Beacon API ensures delivery)
   ↓
7. Events processed by /api/track endpoint
   ↓
8. Analytics aggregated by background workers
```

## 🛠️ Technical Implementation

### Beacon API Features Used

- **navigator.sendBeacon()** - Primary method for reliable delivery
- **Blob** - Proper content type for JSON payload
- **Fallback** - fetch() API for older browsers
- **Error Handling** - Graceful degradation

### Import Structure

```
@/lib/          # Core libraries (db, analytics, oracle)
@/app/          # Next.js app router pages and API routes
@/components/   # React components (if any)
@/types/        # TypeScript type definitions (if any)
```

The system is fully configured and ready to use with both Beacon API for reliable event tracking and `@` imports for clean module resolution!
