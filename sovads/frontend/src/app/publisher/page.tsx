'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import WalletButton from '@/components/WalletButton'
import { getTokenSymbol } from '@/lib/tokens'
import { useAds } from '@/hooks/useAds'

interface PublisherStats {
  impressions: number
  clicks: number
  ctr: number
  totalRevenue: number
}

interface PublisherSite {
  id: string
  domain: string
  siteId: string
  apiKey?: string
  apiSecret?: string // Only shown once during generation
  verified: boolean
  createdAt: string
}

export default function PublisherDashboard() {
  const { address, isConnected } = useAccount()
  const { subscribePublisher, addSite, removeSite, getPublisherSites, isPublisher, isLoading: contractLoading } = useAds()
  const [stats, setStats] = useState<PublisherStats>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    totalRevenue: 0
  })
  const [wallet, setWallet] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [sites, setSites] = useState<PublisherSite[]>([])
  const [onChainSites, setOnChainSites] = useState<string[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false)
  const [isRegisteringOnChain, setIsRegisteringOnChain] = useState(false)
  const [isAddingSite, setIsAddingSite] = useState(false)
  const [isRemovingSite, setIsRemovingSite] = useState<string | null>(null)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<PublisherSite | null>(null)
  const [activeTab, setActiveTab] = useState<'sdk' | 'script'>('sdk')
  const [showApiSecret, setShowApiSecret] = useState<Record<string, boolean>>({})
  const [newApiSecrets, setNewApiSecrets] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isConnected && address) {
      setWallet(address)
      // Load data in sequence: check on-chain first, then sync
      const loadData = async () => {
        await checkOnChainRegistration(address)
        await loadOnChainSites(address) // This will call loadPublisherData internally
      }
      loadData()
    } else {
      // Reset when disconnected
      setIsRegisteredOnChain(false)
      setSites([])
      setOnChainSites([])
      setSelectedSite(null)
    }
  }, [isConnected, address])

  const checkOnChainRegistration = async (walletAddress: string) => {
    try {
      const isRegistered = await isPublisher(walletAddress)
      console.log('On-chain registration check:', { walletAddress, isRegistered })
      setIsRegisteredOnChain(isRegistered === true)
    } catch (error) {
      console.error('Error checking on-chain registration:', error)
      setIsRegisteredOnChain(false)
    }
  }

  const loadPublisherData = async (walletAddress: string, onChainSitesList?: string[]) => {
    try {
      // Load publisher and sites
      const [publisherResponse, sitesResponse] = await Promise.all([
        fetch(`/api/publishers/register?wallet=${walletAddress}`),
        fetch(`/api/publishers/sites?wallet=${walletAddress}`)
      ])

      if (publisherResponse.ok) {
        const publisherData = await publisherResponse.json()
        setIsRegistered(true)
        loadStats(publisherData.id)
      }

      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json()
        const dbSites = (sitesData.sites || []).map((site: any) => ({
          ...site,
          apiSecret: site.apiSecret || undefined // Only set if returned (new sites)
        }))
        setSites(dbSites)
        
        // Store new API secrets temporarily for display
        dbSites.forEach((site: PublisherSite) => {
          if (site.apiSecret && !newApiSecrets[site.id]) {
            setNewApiSecrets(prev => ({ ...prev, [site.id]: site.apiSecret! }))
          }
        })
        
        // Sync on-chain sites to database if they don't exist
        const sitesToSync = onChainSitesList || onChainSites
        if (sitesToSync.length > 0) {
          let needsReload = false
          for (const onChainSite of sitesToSync) {
            const existsInDb = dbSites.some((s: PublisherSite) => s.domain === onChainSite)
            if (!existsInDb) {
              // Site exists on-chain but not in DB - add it
              try {
                const response = await fetch('/api/publishers/sites', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ wallet: walletAddress, domain: onChainSite })
                })
                if (response.ok) {
                  needsReload = true
                  console.log('Synced on-chain site to database:', onChainSite)
                }
              } catch (error) {
                console.error('Error syncing on-chain site to database:', error)
              }
            }
          }
          
          // Reload sites if any were added
          if (needsReload) {
            const updatedResponse = await fetch(`/api/publishers/sites?wallet=${walletAddress}`)
            if (updatedResponse.ok) {
              const updatedData = await updatedResponse.json()
              const updatedSites = updatedData.sites || []
              setSites(updatedSites)
              if (updatedSites.length > 0 && (!selectedSite || !updatedSites.find((s: PublisherSite) => s.id === selectedSite.id))) {
                setSelectedSite(updatedSites[0])
              }
              return // Exit early after reload
            }
          }
        }
        
        if (dbSites.length > 0 && !selectedSite) {
          setSelectedSite(dbSites[0])
        }
      }
    } catch (error) {
      console.error('Error loading publisher data:', error)
    }
  }

  const loadOnChainSites = async (walletAddress: string) => {
    try {
      const sites = await getPublisherSites(walletAddress)
      console.log('Loaded on-chain sites:', { walletAddress, sites })
      const onChainSitesList = sites || []
      setOnChainSites(onChainSitesList)
      // If there are sites on-chain, publisher is registered
      if (onChainSitesList.length > 0) {
        setIsRegisteredOnChain(true)
        // Sync on-chain sites to database
        await loadPublisherData(walletAddress, onChainSitesList)
      } else {
        // No on-chain sites, just load from database
        await loadPublisherData(walletAddress, [])
      }
    } catch (error) {
      console.error('Error loading on-chain sites:', error)
      // Even if on-chain check fails, load from database
      await loadPublisherData(walletAddress, [])
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
    if (!wallet || !newDomain) return
    if (!address) {
      setRegistrationError('Please connect your wallet')
      return
    }

    setRegistrationError(null)
    setRegistrationSuccess(null)
    setIsRegisteringOnChain(true)

    try {
      const domainToRegister = newDomain.trim()
      
      // Step 1: Register on-chain first
      if (!isRegisteredOnChain) {
        console.log('Registering publisher on-chain...')
        await subscribePublisher([domainToRegister])
        console.log('Publisher registered on-chain successfully')
        setIsRegisteredOnChain(true)
        await loadOnChainSites(address)
      } else {
        // Add site on-chain if publisher already registered
        await addSite(domainToRegister)
        await loadOnChainSites(address)
      }

      // Step 2: Save to database
      const response = await fetch('/api/publishers/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet: address, domain: domainToRegister })
      })

      if (response.ok) {
        const data = await response.json()
        // Store API secret if returned (new sites only)
        if (data.site?.apiSecret) {
          setNewApiSecrets((prev: Record<string, string>) => ({ ...prev, [data.site.id]: data.site.apiSecret }))
          setShowApiSecret((prev: Record<string, boolean>) => ({ ...prev, [data.site.id]: true }))
        }
        await loadPublisherData(address)
        // Clear input and show success
        setNewDomain('')
        const successMsg = data.site?.apiSecret 
          ? `Successfully registered ${domainToRegister}! API credentials generated.`
          : `Successfully registered ${domainToRegister}!`
        setRegistrationSuccess(successMsg)
        // Clear success message after 5 seconds
        setTimeout(() => setRegistrationSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        if (response.status === 409) {
          // Site already exists
          setRegistrationError('This site is already registered')
        } else {
          throw new Error(errorData.error || 'Failed to save to database')
        }
      }
    } catch (error) {
      console.error('Error registering publisher:', error)
      setRegistrationError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsRegisteringOnChain(false)
    }
  }

  const addNewSite = async () => {
    if (!newDomain || !address) return
    setIsAddingSite(true)
    setRegistrationError(null)
    setRegistrationSuccess(null)

    try {
      const domainToAdd = newDomain.trim()
      
      // Add on-chain if publisher is registered
      if (isRegisteredOnChain) {
        await addSite(domainToAdd)
        await loadOnChainSites(address)
      }

      // Add to database
      const response = await fetch('/api/publishers/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet: address, domain: domainToAdd })
      })

      if (response.ok) {
        const data = await response.json()
        // Store API secret if returned (new sites only)
        if (data.site?.apiSecret) {
          setNewApiSecrets(prev => ({ ...prev, [data.site.id]: data.site.apiSecret }))
          setShowApiSecret(prev => ({ ...prev, [data.site.id]: true }))
        }
        await loadPublisherData(address)
        // Clear input and show success
        setNewDomain('')
        const successMsg = data.site?.apiSecret
          ? `Successfully added ${domainToAdd}! API credentials generated.`
          : `Successfully added ${domainToAdd}!`
        setRegistrationSuccess(successMsg)
        // Clear success message after 5 seconds
        setTimeout(() => setRegistrationSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        if (response.status === 409) {
          setRegistrationError('This site is already registered')
        } else {
          throw new Error(errorData.error || 'Failed to add site')
        }
      }
    } catch (error) {
      console.error('Error adding site:', error)
      setRegistrationError(error instanceof Error ? error.message : 'Failed to add site')
    } finally {
      setIsAddingSite(false)
    }
  }

  const removeSiteFromDB = async (siteId: string, domain: string) => {
    if (!address) return
    setIsRemovingSite(siteId)
    setRegistrationError(null)

    try {
      // Remove from contract if needed
      if (isRegisteredOnChain && onChainSites.includes(domain)) {
        const index = onChainSites.indexOf(domain)
        if (index !== -1) {
          await removeSite(index)
          await loadOnChainSites(address)
        }
      }

      // Remove from database
      const response = await fetch(`/api/publishers/sites?siteId=${siteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPublisherData(address)
        if (selectedSite?.id === siteId) {
          setSelectedSite(null)
        }
      } else {
        throw new Error('Failed to remove site')
      }
    } catch (error) {
      console.error('Error removing site:', error)
      setRegistrationError(error instanceof Error ? error.message : 'Failed to remove site')
    } finally {
      setIsRemovingSite(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Publisher Dashboard</h1>

        {!isConnected ? (
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to register as a publisher and start earning from ads
            </p>
            <WalletButton className="w-full" />
          </div>
        ) : !isRegistered ? (
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Register Your First Website</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="example.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  You can add more websites after registration
                </p>
              </div>
              {registrationError && (
                <div className="bg-destructive/20 border border-destructive/50 rounded-md p-3 text-destructive text-sm">
                  {registrationError}
                </div>
              )}
              {registrationSuccess && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-md p-3 text-green-700 dark:text-green-400 text-sm">
                  ✓ {registrationSuccess}
                </div>
              )}
              <button
                onClick={registerPublisher}
                disabled={isRegisteringOnChain || contractLoading}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegisteringOnChain ? 'Registering on-chain...' : 'Register Publisher'}
              </button>
              {isRegisteredOnChain && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-md p-3 text-green-700 dark:text-green-400 text-sm">
                  ✓ Already registered on-chain
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="text-2xl font-bold text-foreground">{stats.impressions.toLocaleString()}</div>
                <div className="text-muted-foreground">Impressions</div>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="text-2xl font-bold text-foreground">{stats.clicks.toLocaleString()}</div>
                <div className="text-muted-foreground">Clicks</div>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="text-2xl font-bold text-foreground">{stats.ctr.toFixed(2)}%</div>
                <div className="text-muted-foreground">CTR</div>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
                <div className="text-2xl font-bold text-foreground">{stats.totalRevenue.toFixed(6)}</div>
                <div className="text-muted-foreground">Total Revenue</div>
              </div>
            </div>

            {/* Websites Management */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Websites</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      On-chain Registration Status
                    </label>
                    <button
                      onClick={async () => {
                        if (address) {
                          await checkOnChainRegistration(address)
                          await loadOnChainSites(address)
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50"
                      title="Refresh status"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                    isRegisteredOnChain 
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/50' 
                      : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/50'
                  }`}>
                    {isRegisteredOnChain ? '✓ Registered on-chain' : '⚠ Not registered on-chain'}
                  </div>
                  {onChainSites.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Found {onChainSites.length} site(s) registered on-chain: {onChainSites.join(', ')}
                    </p>
                  )}
                  {!isRegisteredOnChain && onChainSites.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Click "Register on-chain" below to register your publisher address on the smart contract.
                    </p>
                  )}
                </div>

                {/* Sites List */}
                {sites.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Registered Websites ({sites.length})
                    </label>
                    <div className="space-y-2">
                      {sites.map((site) => (
                        <div key={site.id} className="bg-muted/50 border border-border rounded-md p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-foreground">{site.domain}</span>
                                {onChainSites.includes(site.domain) && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 text-xs rounded border border-green-500/50">
                                    On-chain
                                  </span>
                                )}
                                {site.verified && (
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs rounded border border-blue-500/50">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {site.siteId}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(site.siteId)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    Copy
                                  </button>
                                </div>
                                {site.apiKey && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">API Key:</span>
                                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-1 truncate">
                                      {site.apiKey}
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(site.apiKey!)}
                                      className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                                {(site.apiSecret || newApiSecrets[site.id]) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">API Secret:</span>
                                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-1 truncate">
                                        {showApiSecret[site.id] ? (site.apiSecret || newApiSecrets[site.id]) : '••••••••'}
                                      </code>
                                      <button
                                        onClick={() => setShowApiSecret(prev => ({ ...prev, [site.id]: !prev[site.id] }))}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        {showApiSecret[site.id] ? 'Hide' : 'Show'}
                                      </button>
                                      <button
                                        onClick={() => copyToClipboard(site.apiSecret || newApiSecrets[site.id] || '')}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                      ⚠️ Save this secret securely! It won't be shown again.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeSiteFromDB(site.id, site.domain)}
                              disabled={isRemovingSite === site.id}
                              className="ml-4 px-3 py-1.5 bg-destructive/20 text-destructive text-sm rounded hover:bg-destructive/30 disabled:opacity-50"
                            >
                              {isRemovingSite === site.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Site */}
                <div className="border-t border-border pt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Add New Website
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value)
                        // Clear messages when user starts typing
                        if (registrationError) setRegistrationError(null)
                        if (registrationSuccess) setRegistrationSuccess(null)
                      }}
                      className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="example.com"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isAddingSite && !isRegisteringOnChain && newDomain.trim()) {
                          if (sites.length === 0 && !isRegisteredOnChain) {
                            registerPublisher()
                          } else {
                            addNewSite()
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (sites.length === 0 && !isRegisteredOnChain) {
                          registerPublisher()
                        } else {
                          addNewSite()
                        }
                      }}
                      disabled={!newDomain.trim() || isAddingSite || isRegisteringOnChain || contractLoading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingSite || isRegisteringOnChain ? 'Adding...' : 'Add Site'}
                    </button>
                  </div>
                  {registrationError && (
                    <div className="bg-destructive/20 border border-destructive/50 rounded-md p-3 text-destructive text-sm mt-2">
                      {registrationError}
                    </div>
                  )}
                  {registrationSuccess && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-md p-3 text-green-700 dark:text-green-400 text-sm mt-2">
                      ✓ {registrationSuccess}
                    </div>
                  )}
                  {sites.length === 0 && !isRegisteredOnChain && !registrationError && !registrationSuccess && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Adding your first site will register you as a publisher on-chain.
                    </p>
                  )}
                </div>

                {!isRegisteredOnChain && sites.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!address) return
                      setIsRegisteringOnChain(true)
                      setRegistrationError(null)
                      try {
                        await subscribePublisher(sites.map(s => s.domain))
                        setIsRegisteredOnChain(true)
                        await checkOnChainRegistration(address)
                        await loadOnChainSites(address)
                      } catch (error) {
                        setRegistrationError(error instanceof Error ? error.message : 'Failed to register on-chain')
                      } finally {
                        setIsRegisteringOnChain(false)
                      }
                    }}
                    disabled={isRegisteringOnChain || contractLoading}
                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegisteringOnChain ? 'Registering on-chain...' : 'Register All Sites on-chain'}
                  </button>
                )}
              </div>
            </div>

            {/* Integration Code for Selected Site */}
            {selectedSite && (
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Integration Code
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Website
                    </label>
                    <select
                      value={selectedSite.id}
                      onChange={(e) => {
                        const site = sites.find(s => s.id === e.target.value)
                        if (site) setSelectedSite(site)
                      }}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.domain}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-border">
                    <button
                      onClick={() => setActiveTab('sdk')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === 'sdk'
                          ? 'text-foreground border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>SDK</span>
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded border border-primary/50">
                          Recommended
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('script')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === 'script'
                          ? 'text-foreground border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Script Tag
                    </button>
                  </div>
                  
                  {/* SDK Method (Recommended) */}
                  {activeTab === 'sdk' && (
                  <div>
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
                      {/* Code Header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                        <span className="ml-2 text-xs text-neutral-400">sdk-integration.js</span>
                      </div>
                      {/* Code Content */}
                      <pre className="bg-neutral-950 text-neutral-100 text-sm leading-6 p-4 overflow-x-auto">
                        <code>
                          <span className="text-neutral-400">{'// '}</span>
                          <span className="text-white">Integration code for {selectedSite.domain}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'// '}</span>
                          <span className="text-white">Install: npm install @sovads/sdk</span>
                          {'\n\n'}
                          <span className="text-primary">import</span>
                          <span className="text-white"> {'{'} SovAds, Banner {'}'} </span>
                          <span className="text-primary">from</span>
                          <span className="text-green-400"> '@sovads/sdk'</span>
                          <span className="text-neutral-400">{';'}</span>
                          {'\n\n'}
                          <span className="text-primary">const</span>
                          <span className="text-white"> adsClient = </span>
                          <span className="text-primary">new</span>
                          <span className="text-white"> SovAds({'{'}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">siteId</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.siteId}'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">apiKey</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.apiKey || 'YOUR_API_KEY'}'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">apiSecret</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.apiSecret || newApiSecrets[selectedSite.id] || 'YOUR_API_SECRET'}'</span>
                          {'\n'}
                          <span className="text-white">{'});'}</span>
                          <span className="text-neutral-400">{';'}</span>
                          {'\n\n'}
                          <span className="text-primary">const</span>
                          <span className="text-white"> banner = </span>
                          <span className="text-primary">new</span>
                          <span className="text-white"> Banner(adsClient, </span>
                          <span className="text-green-400">'banner'</span>
                          <span className="text-white">);</span>
                          {'\n'}
                          <span className="text-primary">await</span>
                          <span className="text-white"> banner.render(); </span>
                          <span className="text-neutral-400">{'// renders after site ready'}</span>
                        </code>
                      </pre>
                    </div>
                    <button
                      onClick={() => {
                        const apiKey = selectedSite.apiKey || 'YOUR_API_KEY'
                        const apiSecret = selectedSite.apiSecret || newApiSecrets[selectedSite.id] || 'YOUR_API_SECRET'
                        const code = `// Integration code for ${selectedSite.domain}\n// Install: npm install @sovads/sdk\n\nimport { SovAds, Banner } from '@sovads/sdk';\n\nconst adsClient = new SovAds({\n    siteId: '${selectedSite.siteId}',\n    apiKey: '${apiKey}',\n    apiSecret: '${apiSecret}', // Keep this secure!\n});\n\nconst banner = new Banner(adsClient, 'banner');\nawait banner.render(); // renders after site ready`
                        copyToClipboard(code)
                      }}
                      className="mt-2 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
                    >
                      Copy SDK Code
                    </button>
                    {(!selectedSite.apiKey || (!selectedSite.apiSecret && !newApiSecrets[selectedSite.id])) && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                        ⚠️ API credentials not available. Please regenerate them.
                      </p>
                    )}
                  </div>
                  )}

                  {/* Script Method */}
                  {activeTab === 'script' && (
                  <div>
                    <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
                      {/* Code Header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                        <span className="ml-2 text-xs text-neutral-400">script-integration.html</span>
                      </div>
                      {/* Code Content */}
                      <pre className="bg-neutral-950 text-neutral-100 text-sm leading-6 p-4 overflow-x-auto">
                        <code>
                          <span className="text-neutral-400">{'<!-- '}</span>
                          <span className="text-white">Integration code for {selectedSite.domain}</span>
                          <span className="text-neutral-400">{' -->'}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'<!-- '}</span>
                          <span className="text-white">Add this to your website's {'<head>'}</span>
                          <span className="text-neutral-400">{' -->'}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'<script '}</span>
                          <span className="text-primary">src</span>
                          <span className="text-white">=</span>
                          <span className="text-green-400">"https://api.sovads.com/sdk.js"</span>
                          <span className="text-neutral-400">{'></script>'}</span>
                          {'\n\n'}
                          <span className="text-neutral-400">{'<!-- '}</span>
                          <span className="text-white">Add this where you want ads to appear</span>
                          <span className="text-neutral-400">{' -->'}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'<div '}</span>
                          <span className="text-primary">id</span>
                          <span className="text-white">=</span>
                          <span className="text-green-400">"sovads-banner"</span>
                          <span className="text-neutral-400">{'></div>'}</span>
                          {'\n\n'}
                          <span className="text-neutral-400">{'<script>'}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'// '}</span>
                          <span className="text-white">Initialize SovAds SDK</span>
                          {'\n'}
                          <span className="text-primary">const</span>
                          <span className="text-white"> sovads = </span>
                          <span className="text-primary">new</span>
                          <span className="text-white"> SovAds({'{'}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">siteId</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.siteId}'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">apiKey</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.apiKey || 'YOUR_API_KEY'}'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">apiSecret</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'{selectedSite.apiSecret || newApiSecrets[selectedSite.id] || 'YOUR_API_SECRET'}'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">containerId</span>
                          <span className="text-white">: </span>
                          <span className="text-green-400">'sovads-banner'</span>
                          <span className="text-neutral-400">{','}</span>
                          {'\n'}
                          <span className="text-white">    </span>
                          <span className="text-primary">debug</span>
                          <span className="text-white">: </span>
                          <span className="text-accent">true</span>
                          {'\n'}
                          <span className="text-white">{'});'}</span>
                          {'\n'}
                          <span className="text-neutral-400">{'</script>'}</span>
                        </code>
                      </pre>
                    </div>
                    <button
                      onClick={() => {
                        const apiKey = selectedSite.apiKey || 'YOUR_API_KEY'
                        const apiSecret = selectedSite.apiSecret || newApiSecrets[selectedSite.id] || 'YOUR_API_SECRET'
                        const code = `<!-- Integration code for ${selectedSite.domain} -->\n<!-- Add this to your website's <head> -->\n<script src="https://api.sovads.com/sdk.js"></script>\n\n<!-- Add this where you want ads to appear -->\n<div id="sovads-banner"></div>\n\n<script>\n// Initialize SovAds SDK (encrypted)\nconst sovads = new SovAds({\n    siteId: '${selectedSite.siteId}',\n    apiKey: '${apiKey}',\n    apiSecret: '${apiSecret}', // Keep this secure!\n    containerId: 'sovads-banner',\n    debug: true\n});\n</script>`
                        copyToClipboard(code)
                      }}
                      className="mt-2 w-full bg-muted text-foreground px-4 py-2 rounded-md font-medium hover:bg-muted/80 border border-border"
                    >
                      Copy Script Code
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* Withdraw Section */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Withdraw Earnings</h2>
              <div className="space-y-4">
                <div className="text-foreground">
                  Available Balance: <span className="text-foreground font-semibold">{stats.totalRevenue.toFixed(6)}</span>
                </div>
                <button
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90"
                  onClick={() => alert('Withdrawal functionality will be implemented with smart contracts')}
                >
                  Withdraw to Wallet
                </button>
                <p className="text-sm text-muted-foreground">
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