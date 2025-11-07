# @sovads/sdk

SovAds SDK for publisher integration - A modular ad network SDK with banner, popup, and sidebar components.

## Installation

```bash
npm install sovads-sdk
# or
pnpm add sovads-sdk
# or
yarn add sovads-sdk
```

## Usage

### Basic Setup

```javascript
import { SovAds, Banner, Popup, Sidebar } from 'sovads-sdk'

// Initialize SDK
const sovads = new SovAds({
  apiUrl: 'https://ads.sovseas.xyz', // Optional, defaults to production URL
  debug: false, // Enable debug logging
  siteId: 'your-site-id', // Optional, will auto-detect if not provided
})

// Banner Ad
const banner = new Banner(sovads, 'banner-container')
await banner.render()

// Popup Ad
const popup = new Popup(sovads)
await popup.show() // Shows after 3 seconds by default

// Sidebar Ad
const sidebar = new Sidebar(sovads, 'sidebar-container')
await sidebar.render()
```

### HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Site with SovAds</title>
</head>
<body>
  <h1>Welcome to My Site</h1>
  
  <!-- Banner Ad Container -->
  <div id="banner-container"></div>
  
  <!-- Sidebar Ad Container -->
  <div id="sidebar-container"></div>
  
  <script type="module">
    import { SovAds, Banner, Sidebar } from 'sovads-sdk'
    
    const sovads = new SovAds({ debug: true })
    const banner = new Banner(sovads, 'banner-container')
    const sidebar = new Sidebar(sovads, 'sidebar-container')
    
    banner.render()
    sidebar.render()
  </script>
</body>
</html>
```

## API Reference

### SovAds

Main SDK class for initialization and configuration.

#### Constructor

```typescript
new SovAds(config?: SovAdsConfig)
```

#### Config Options

- `apiUrl?: string` - API endpoint URL (default: `https://ads.sovseas.xyz`)
- `debug?: boolean` - Enable debug logging (default: `false`)
- `siteId?: string` - Site ID (optional, will auto-detect)
- `consumerId?: string` - Consumer ID for targeting specific advertisers

### Banner

Banner ad component.

```typescript
const banner = new Banner(sovads: SovAds, containerId: string)
await banner.render(consumerId?: string)
```

### Popup

Popup ad component.

```typescript
const popup = new Popup(sovads: SovAds)
await popup.show(consumerId?: string, delay?: number)
popup.hide()
```

### Sidebar

Sidebar ad component.

```typescript
const sidebar = new Sidebar(sovads: SovAds, containerId: string)
await sidebar.render(consumerId?: string)
```

## Features

- ✅ Automatic site detection
- ✅ Impression and click tracking
- ✅ Render verification with IntersectionObserver
- ✅ Image load error handling
- ✅ Network retry logic
- ✅ CORS support
- ✅ TypeScript support
- ✅ Debug logging

## License

MIT

