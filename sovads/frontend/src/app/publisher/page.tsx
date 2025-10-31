'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import WalletButton from '@/components/WalletButton'
import { getTokenSymbol } from '@/lib/tokens'

interface PublisherStats {
  impressions: number
  clicks: number
  ctr: number
  totalRevenue: number
}

export default function PublisherDashboard() {
  const { address, isConnected } = useAccount()
  const [stats, setStats] = useState<PublisherStats>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    totalRevenue: 0
  })
  const [wallet, setWallet] = useState('')
  const [domain, setDomain] = useState('')
  const [siteId, setSiteId] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      setWallet(address)
      loadPublisherData(address)
    }
  }, [isConnected, address])

  const loadPublisherData = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/publishers/register?wallet=${walletAddress}`)
      if (response.ok) {
        const data = await response.json()
        setDomain(data.domain)
        setSiteId(`site_${data.id}`)
        setIsRegistered(true)
        loadStats(data.id)
      }
    } catch (error) {
      console.error('Error loading publisher data:', error)
    }
  }

  const loadStats = async (publisherId: string) => {
    try {
      const response = await fetch(`/api/analytics?publisherId=${publisherId}&days=30`)
      if (response.ok) {
        const data = await response.json()
        setStats({
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: data.ctr,
          totalRevenue: data.totalRevenue
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const registerPublisher = async () => {
    if (!wallet || !domain) return

    try {
      const response = await fetch('/api/publishers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet, domain })
      })

      if (response.ok) {
        const data = await response.json()
        setSiteId(data.siteId)
        setIsRegistered(true)
        localStorage.setItem('publisherWallet', wallet)
        loadPublisherData(wallet)
      }
    } catch (error) {
      console.error('Error registering publisher:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-white">
                SovAds
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/advertiser" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Advertiser
              </Link>
              <Link 
                href="/publisher" 
                className="text-white px-3 py-2 rounded-md text-sm font-medium bg-gray-800"
              >
                Publisher
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Publisher Dashboard</h1>

        {!isConnected ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-6">
              Connect your wallet to register as a publisher and start earning from ads
            </p>
            <WalletButton className="w-full" />
          </div>
        ) : !isRegistered ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Register Your Website</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="example.com"
                />
              </div>
              <button
                onClick={registerPublisher}
                className="w-full bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-100"
              >
                Register Publisher
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="text-2xl font-bold text-white">{stats.impressions.toLocaleString()}</div>
                <div className="text-gray-400">Impressions</div>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="text-2xl font-bold text-white">{stats.clicks.toLocaleString()}</div>
                <div className="text-gray-400">Clicks</div>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="text-2xl font-bold text-white">{stats.ctr.toFixed(2)}%</div>
                <div className="text-gray-400">CTR</div>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <div className="text-2xl font-bold text-white">{stats.totalRevenue.toFixed(6)}</div>
                <div className="text-gray-400">Total Revenue</div>
              </div>
            </div>

            {/* Site ID and Integration */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Integration Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Site ID
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={siteId}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-l-md text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(siteId)}
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-r-md text-white hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Domain
                  </label>
                  <div className="text-white">{domain}</div>
                </div>
              </div>
            </div>

            {/* Integration Code */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Integration Code</h2>
              <div className="bg-black border border-gray-600 rounded-md p-4">
                <pre className="text-gray-300 text-sm overflow-x-auto">
{`<!-- Add this to your website's <head> -->
<script src="https://api.sovads.com/sdk.js"></script>

<!-- Add this where you want ads to appear -->
<div id="sovads-banner"></div>

<script>
// Initialize SovAds SDK
const sovads = new SovAds({
    siteId: '${siteId}',
    containerId: 'sovads-banner',
    debug: true
});
</script>`}
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(`<script src="https://api.sovads.com/sdk.js"></script>\n<div id="sovads-banner"></div>\n<script>\nconst sovads = new SovAds({\n    siteId: '${siteId}',\n    containerId: 'sovads-banner',\n    debug: true\n});\n</script>`)}
                className="mt-4 bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-100"
              >
                Copy Integration Code
              </button>
            </div>

            {/* Withdraw Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Withdraw Earnings</h2>
              <div className="space-y-4">
                <div className="text-gray-300">
                  Available Balance: <span className="text-white font-semibold">{stats.totalRevenue.toFixed(6)}</span>
                </div>
                <button
                  className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-100"
                  onClick={() => alert('Withdrawal functionality will be implemented with smart contracts')}
                >
                  Withdraw to Wallet
                </button>
                <p className="text-sm text-gray-400">
                  Withdrawals are processed on-chain using smart contracts. Gas fees are covered by SovAds.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}