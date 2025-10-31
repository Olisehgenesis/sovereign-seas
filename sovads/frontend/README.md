# SovAds - Decentralized Ad Network

A decentralized advertising system that allows crypto and Web3 websites (publishers) to serve ads and earn revenue from verified impressions and clicks. Advertisers create and fund campaigns with stablecoins, and publishers integrate ads via an SDK. SovAds ensures transparent, fraud-resistant, and on-chain accountable ad settlements.

## 🚀 Features

- **On-Chain Transparency** - All payments and metrics are recorded on-chain
- **Fraud Prevention** - Advanced fraud detection using blockchain verification
- **Crypto Payments** - Earn in USDC/cUSD with instant transactions
- **Real-time Analytics** - Track impressions, clicks, and earnings in real-time
- **Lightweight SDK** - Easy integration for publishers
- **Oracle Automation** - Automated on-chain payout processing

## 🏗️ Project Structure

```
sovads/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   └── lib/       # Core libraries
│   ├── prisma/        # Database schema
│   └── scripts/       # Utility scripts
└── sdk/               # Publisher SDK
    └── index.ts       # SDK implementation
```

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sovads
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in frontend directory
   DATABASE_URL="mongodb://127.0.0.1:27017/sovads"
   CELO_RPC_URL="https://alfajores-forno.celo-testnet.org"
   ORACLE_PRIVATE_KEY=""
   NEXT_PUBLIC_PROJECT_ID="b56e18d47c72ab683b10814fe9495694"
   ```

4. **Set up MongoDB**
   ```bash
   # Install MongoDB locally or use MongoDB Atlas
   # For local MongoDB:
   # - Install MongoDB Community Edition
   # - Start MongoDB service
   # - Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Start background services**
   ```bash
   pnpm start:system
   ```

## 🔧 Configuration

### Environment Variables

```env
# Database (SQLite)
DATABASE_URL="file:./dev.db"

# Redis
REDIS_URL="redis://localhost:6379"

# Blockchain (placeholder for now)
CELO_RPC_URL="https://alfajores-forno.celo-testnet.org"
BASE_RPC_URL="https://sepolia.base.org"

# Oracle private key (for on-chain operations)
ORACLE_PRIVATE_KEY=""

# Next.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Reown AppKit (WalletConnect)
NEXT_PUBLIC_PROJECT_ID="b56e18d47c72ab683b10814fe9495694"
```

## 🔗 Wallet Connectivity

SovAds uses **Reown AppKit** (formerly WalletConnect) for seamless wallet integration across multiple blockchain networks.

### Supported Networks
- **Ethereum Mainnet** - For USDC payments
- **Arbitrum** - Layer 2 scaling
- **Celo Alfajores** - Testnet for cUSD
- **Base Sepolia** - Testnet for Base network

### Wallet Integration
- **WalletConnect** - Connect via QR code
- **Coinbase Wallet** - Direct integration
- **MetaMask** - Browser extension
- **Injected Wallets** - Any wallet that injects into the browser

### Usage
```tsx
import WalletButton from '@/components/WalletButton'

// Simple wallet connect button
<WalletButton />

// With callbacks
<WalletButton 
  onConnect={(address) => console.log('Connected:', address)}
  onDisconnect={() => console.log('Disconnected')}
/>
```

## 📊 API Endpoints

### Ad Serving
- `GET /api/ads?siteId=xxx` - Serve random eligible ad for site

### Event Tracking
- `POST /api/track` - Log impression or click event

### Publisher Management
- `POST /api/publishers/register` - Register new publisher
- `GET /api/publishers/register?wallet=xxx` - Get publisher info

### Analytics
- `GET /api/analytics?campaignId=xxx` - Get campaign analytics
- `GET /api/analytics?publisherId=xxx` - Get publisher analytics
- `POST /api/analytics/trigger` - Trigger analytics aggregation

### Oracle
- `GET /api/oracle?action=status` - Get oracle status
- `POST /api/oracle` - Control oracle operations

## 🎯 SDK Integration

### Basic Integration

```html
<!-- Add to your website's <head> -->
<script src="https://api.sovads.com/sdk.js"></script>

<!-- Add this where you want ads to appear -->
<div id="sovads-banner"></div>

<script>
// Initialize SovAds SDK
const sovads = new SovAds({
    siteId: 'site_123',
    containerId: 'sovads-banner',
    debug: true
});
</script>
```

### SDK Features

- **Automatic Ad Loading** - Fetches and displays ads
- **Event Tracking** - Tracks impressions and clicks
- **Fraud Prevention** - Fingerprinting and rate limiting
- **Responsive Design** - Adapts to container size
- **Error Handling** - Graceful fallbacks

## 📈 Analytics Pipeline

### Event Flow

1. **Real-time Tracking** - SDK sends events via `sendBeacon`
2. **Redis Caching** - Events stored temporarily for aggregation
3. **Hourly Aggregation** - BullMQ processes events every hour
4. **Daily Aggregation** - Complete daily analytics with hash generation
5. **On-chain Storage** - Daily analytics hash stored on blockchain
6. **Payout Processing** - Oracle processes verified payouts

### Fraud Prevention

- Duplicate event detection
- Rate limiting per campaign/site
- IP address validation
- User agent verification
- Publisher self-click exclusion

## 🔐 Oracle Service

The Oracle service handles:

- **Payout Processing** - Automated on-chain payments to publishers
- **Metrics Submission** - Daily analytics hash submission to contracts
- **Balance Monitoring** - Publisher balance tracking
- **Transaction Management** - Gas optimization and retry logic

### Oracle Operations

```typescript
// Start/stop oracle
await oracle.start()
await oracle.stop()

// Queue payout
await oracle.queuePayout(publisherId, amount, proof)

// Get publisher balance
const balance = await oracle.getPublisherBalance(walletAddress)
```

## 🎨 Dashboards

### Publisher Dashboard
- Register website and wallet
- View real-time metrics (impressions, clicks, CTR, revenue)
- Copy integration code
- Withdraw earnings

### Advertiser Dashboard
- Create and manage campaigns
- Set budgets and CPC
- Track campaign performance
- Monitor spending

### Admin Dashboard
- Monitor system health
- Control oracle operations
- View system statistics
- Trigger manual operations

## 🚀 Deployment

### Production Setup

1. **Database Setup**
   ```bash
   pnpm prisma migrate deploy
   ```

2. **Build Application**
   ```bash
   pnpm build
   ```

3. **Start Production Server**
   ```bash
   pnpm start
   ```

4. **Start Background Workers**
   ```bash
   # Start analytics worker
   node -e "require('./src/lib/analytics').initializeAnalytics()"
   
   # Start oracle service
   node -e "require('./src/lib/oracle').initializeOracle()"
   ```

## 🔮 Future Enhancements

- **Smart Contracts** - Deploy actual SovAdsManager and Escrow contracts
- **AI Integration** - ML-based fraud detection and optimization
- **Multi-chain Support** - Expand beyond Celo/Base
- **Advanced Targeting** - Demographic and behavioral targeting
- **NFT Integration** - NFT-based ad formats
- **DAO Governance** - Community-driven platform decisions

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Email: support@sovads.com

---

**SovAds** - Empowering the decentralized web with transparent advertising.