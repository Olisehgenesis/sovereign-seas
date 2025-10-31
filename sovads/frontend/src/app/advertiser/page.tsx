'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import WalletButton from '@/components/WalletButton'
import { getTokenSymbol, getTokenInfo } from '@/lib/tokens'

interface Campaign {
  id: string
  name: string
  description: string
  bannerUrl: string
  targetUrl: string
  budget: number
  spent: number
  cpc: number
  active: boolean
  tokenAddress?: string
}

interface CampaignStats {
  impressions: number
  clicks: number
  ctr: number
  totalSpent: number
}

export default function AdvertiserDashboard() {
  const { address, isConnected } = useAccount()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignStats, setCampaignStats] = useState<CampaignStats>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    totalSpent: 0
  })
  

  useEffect(() => {
    if (isConnected && address) {
      loadCampaigns(address)
    }
  }, [isConnected, address])

  const loadCampaigns = async (walletAddress: string) => {
    try {
      const res = await fetch(`/api/campaigns/list?wallet=${walletAddress}`)
      if (!res.ok) throw new Error('Failed to load campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns as Campaign[])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const loadCampaignStats = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/analytics?campaignId=${campaignId}&days=30`)
      if (response.ok) {
        const data = await response.json()
        setCampaignStats({
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: data.ctr,
          totalSpent: data.totalRevenue
        })
      }
    } catch (error) {
      console.error('Error loading campaign stats:', error)
    }
  }

  // Creation is handled on dedicated page now

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Advertiser Dashboard</h1>
          {isConnected ? (
            <Link href="/create-campaign" className="btn btn-primary px-6 py-2">
              Create Campaign
            </Link>
          ) : null}
        </div>

        {!isConnected ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-foreground/70 mb-6">Connect your wallet to create and manage advertising campaigns</p>
            <WalletButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Campaigns List */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Your Campaigns</h2>
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-foreground/60">No campaigns yet. Create your first campaign.</div>
                ) : campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCampaign?.id === campaign.id
                        ? 'border-primary bg-secondary'
                        : 'border-border hover:border-foreground/30'
                    }`}
                    onClick={() => {
                      setSelectedCampaign(campaign)
                      loadCampaignStats(campaign.id)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{campaign.name}</h3>
                        <p className="text-foreground/70">{campaign.description}</p>
                        <div className="flex space-x-4 mt-2 text-sm text-foreground/60">
                          {(() => {
                            const tokenSymbol = getTokenSymbol(campaign.tokenAddress);
                            return (
                              <>
                                <span>Budget: {campaign.budget} {tokenSymbol}</span>
                                <span>Spent: {campaign.spent} {tokenSymbol}</span>
                                <span>CPC: {campaign.cpc} {tokenSymbol}</span>
                                <span className={campaign.active ? 'text-green-600' : 'text-red-600'}>
                                  {campaign.active ? 'Active' : 'Inactive'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {((campaign.spent / campaign.budget) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-foreground/60">Budget Used</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Stats */}
            {selectedCampaign && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Campaign Stats: {selectedCampaign.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="text-2xl font-bold">{campaignStats.impressions.toLocaleString()}</div>
                    <div className="text-foreground/60">Impressions</div>
                  </div>
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="text-2xl font-bold">{campaignStats.clicks.toLocaleString()}</div>
                    <div className="text-foreground/60">Clicks</div>
                  </div>
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="text-2xl font-bold">{campaignStats.ctr.toFixed(2)}%</div>
                    <div className="text-foreground/60">CTR</div>
                  </div>
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="text-2xl font-bold">{campaignStats.totalSpent.toFixed(6)}</div>
                    <div className="text-foreground/60">
                      Total Spent {selectedCampaign?.tokenAddress ? `(${getTokenSymbol(selectedCampaign.tokenAddress)})` : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}