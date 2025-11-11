'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAds } from '../../hooks/useAds';
import { getTokenInfo, getTokenLabel } from '@/lib/tokens';

interface CampaignFormData {
  name: string;
  description: string;
  bannerUrl: string;
  targetUrl: string;
  budget: string;
  cpc: string;
  duration: string; // in days
  tokenAddress: string;
  tags: string;
  targetLocations: string;
  metadata: string;
  mediaType: 'image' | 'video';
}

export default function CreateCampaign() {
  const { address } = useAccount();
  const { createCampaign, isLoading, error, getSupportedTokens } = useAds();
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    bannerUrl: '',
    targetUrl: '',
    budget: '',
    cpc: '0.002',
    duration: '',
    tokenAddress: '',
    tags: '',
    targetLocations: '',
  metadata: '',
  mediaType: 'image'
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'budget' | 'dates'>('details');

  // Get token info for selected token
  const selectedTokenInfo = getTokenInfo(formData.tokenAddress) || { symbol: 'TOKEN', name: 'Token', decimals: 18, address: '' };
  
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate unique campaign ID in format sovads-mm-dd-xx
  const generateCampaignId = (): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `sovads-${month}-${day}-${random}`;
  };

  // Load supported tokens on component mount
  React.useEffect(() => {
    const loadSupportedTokens = async () => {
      try {
        const tokens = await getSupportedTokens();
        if (tokens) {
          setSupportedTokens(tokens);
          // Set first token as default if available
          if (tokens.length > 0) {
            setFormData(prev => ({ ...prev, tokenAddress: tokens[0] }));
          }
        }
      } catch (err) {
        console.error('Failed to load supported tokens:', err);
      }
    };
    
    loadSupportedTokens();
  }, [getSupportedTokens]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Campaign name is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.bannerUrl.trim()) return 'Creative media URL is required';
    if (!formData.targetUrl.trim()) return 'Target URL is required';
    if (!formData.budget || parseFloat(formData.budget) < 0.0001) return 'Budget must be at least 0.0001';
    if (!formData.tokenAddress) return 'Token address is required';
    if (!startDate) return 'Start date is required';
    if (!endDate) return 'End date is required';
    if (new Date(startDate) > new Date(endDate)) return 'Start date must be before end date';
    
    // Validate URLs
    try { new URL(formData.targetUrl); } catch { return 'Please enter a valid target URL'; }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setSubmitError('Please connect your wallet');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Generate unique campaign ID
      const campaignId = generateCampaignId();
      
      // Prepare metadata for contract
      const metadata = JSON.stringify({
        id: campaignId,
        name: formData.name,
        description: formData.description,
        bannerUrl: formData.bannerUrl,
        targetUrl: formData.targetUrl,
        cpc: formData.cpc,
        startDate,
        endDate,
        createdAt: new Date().toISOString()
      });

      // Step 1: Create campaign on contract first
      console.log('Creating campaign on contract...');
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const durationSeconds = Math.max(1, Math.floor((end - start) / 1000));
      const txHash = await createCampaign(
        formData.tokenAddress,
        formData.budget,
        durationSeconds,
        metadata
      );

      console.log('Campaign created on contract successfully');

      // Step 2: Save to database after successful contract interaction
      console.log('Saving campaign to database...');
      
      const parsedTags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const parsedLocations = formData.targetLocations
        .split(',')
        .map((loc) => loc.trim())
        .filter((loc) => loc.length > 0)

      let metadataObject: Record<string, unknown> | undefined
      if (formData.metadata.trim().length > 0) {
        try {
          metadataObject = JSON.parse(formData.metadata)
        } catch (err) {
          console.error('Invalid metadata JSON:', err)
          setSubmitError('Metadata must be valid JSON')
          setIsSubmitting(false)
          return
        }
      }

      const resp = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address as `0x${string}`,
          campaignData: {
            ...formData,
            tags: parsedTags,
            targetLocations: parsedLocations,
            metadata: metadataObject,
          },
          transactionHash: txHash,
          contractCampaignId: campaignId,
          startDate,
          endDate,
        }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        const errorMessage = data?.error || data?.details || 'Failed to save campaign to database'
        console.error('API error response:', data)
        throw new Error(errorMessage)
      }
      const result = await resp.json()
      console.log('Campaign saved to database:', result.campaign.id);
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        bannerUrl: '',
        targetUrl: '',
        budget: '',
        cpc: '0.002',
        duration: '',
        tokenAddress: supportedTokens[0] || '',
        tags: '',
        targetLocations: '',
        metadata: '',
        mediaType: 'image'
      });
      setStartDate('');
      setEndDate('');
      setBannerPreview('');

    } catch (err) {
      console.error('Error creating campaign:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Created Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Your campaign has been created on the blockchain and saved to the database.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Another Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => { if (typeof window !== 'undefined') window.history.back(); }}
          className="btn btn-outline px-4 py-2"
        >
          Back
        </button>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Create New Campaign</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'details' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'budget' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          onClick={() => setActiveTab('budget')}
        >
          Budget
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'dates' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          onClick={() => setActiveTab('dates')}
        >
          Dates
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'details' && (
          <>
            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter campaign name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground/80 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe your campaign"
                required
              />
            </div>

            {/* Creative Media Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Creative (image, GIF, or short video) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,video/*,.gif"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setUploading(true)
                    setSubmitError(null)
                    try {
                      const form = new FormData()
                      form.append('image', file)
                      const res = await fetch('/api/uploads/image', { method: 'POST', body: form })
                      if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}))
                        throw new Error(errorData.error || 'Upload failed')
                      }
                      const data = await res.json()
                      setFormData(prev => ({
                        ...prev,
                        bannerUrl: data.url,
                        mediaType: data.mediaType === 'video' ? 'video' : 'image'
                      }))
                      setBannerPreview(data.url)
                    } catch (err) {
                      console.error('Upload error', err)
                      setSubmitError(err instanceof Error ? err.message : 'Failed to upload media')
                    } finally {
                      setUploading(false)
                    }
                  }}
                  className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
                  disabled={uploading}
                  required
                />
              </div>
              {uploading && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-foreground/60">Uploading media...</p>
                </div>
              )}
              {bannerPreview && !uploading && (
                <div className="mt-3">
                  {formData.mediaType === 'video' ? (
                    <div className="relative">
                      <video
                        src={bannerPreview}
                        className="max-h-64 w-full rounded-md border border-border object-contain"
                        controls
                        playsInline
                        muted
                      />
                      <p className="text-xs text-foreground/60 mt-1">Video preview</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={bannerPreview} 
                        alt="Media preview" 
                        className="max-h-64 w-full rounded-md border border-border object-contain" 
                      />
                      <p className="text-xs text-foreground/60 mt-1">
                        {bannerPreview.toLowerCase().includes('.gif') ? 'GIF preview' : 'Image preview'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target URL */}
            <div>
              <label htmlFor="targetUrl" className="block text-sm font-medium text-foreground/80 mb-2">
                Target URL *
              </label>
              <input
                type="url"
                id="targetUrl"
                name="targetUrl"
                value={formData.targetUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com/landing-page"
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-foreground/80 mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="DeFi, NFTs, web3 gaming"
              />
              <p className="mt-1 text-xs text-foreground/60">
                Add keywords that describe your campaign. Publishers can use these to understand the ad context.
              </p>
            </div>

            {/* Target Locations */}
            <div>
              <label htmlFor="targetLocations" className="block text-sm font-medium text-foreground/80 mb-2">
                Target Locations (comma separated)
              </label>
              <input
                type="text"
                id="targetLocations"
                name="targetLocations"
                value={formData.targetLocations}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="United States, Canada, Nigeria"
              />
              <p className="mt-1 text-xs text-foreground/60">
                Specify the primary countries or regions you want to reach.
              </p>
            </div>

            {/* Metadata */}
            <div>
              <label htmlFor="metadata" className="block text-sm font-medium text-foreground/80 mb-2">
                Additional Metadata (JSON)
              </label>
              <textarea
                id="metadata"
                name="metadata"
                value={formData.metadata}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                placeholder='{"audience": "builders", "cta": "Join the beta"}'
              />
              <p className="mt-1 text-xs text-foreground/60">
                Optional. Provide structured metadata to help publishers understand the campaign context.
              </p>
            </div>
          </>
        )}

        {activeTab === 'budget' && (
          <>
            {/* Token first */}
            <div>
              <label htmlFor="tokenAddress" className="block text-sm font-medium text-foreground/80 mb-2">
                Payment Token *
              </label>
              <select
                id="tokenAddress"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select a token</option>
                {supportedTokens.map((token, index) => {
                  const label = getTokenLabel(token);
                  return (
                    <option key={index} value={token}>{label}</option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-foreground/80 mb-2">
                  Budget ({selectedTokenInfo.symbol}) *
                </label>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  step="0.0001"
                  min="0.0001"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1.0"
                  required
                />
              </div>
              <div>
                <label htmlFor="cpc" className="block text-sm font-medium text-foreground/80 mb-2">
                  Cost Per Click ({selectedTokenInfo.symbol})
                </label>
                <input
                  type="number"
                  id="cpc"
                  name="cpc"
                  value={formData.cpc}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-border rounded-md bg-secondary text-foreground/70"
                />
                <p className="text-xs text-foreground/60 mt-1">Fixed at 0.002 {selectedTokenInfo.symbol} for now.</p>
              </div>
            </div>

            {/* Duration removed; computed from Start and End dates */}
          </>
        )}

        {activeTab === 'dates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">End Date & Time *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(error || submitError) && (
          <div className="bg-red-100 border border-red-300 rounded-md p-4">
            <p className="text-red-700">{error || submitError}</p>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-outline px-4 py-2"
            onClick={() => {
              if (activeTab === 'budget') setActiveTab('details')
              else if (activeTab === 'dates') setActiveTab('budget')
            }}
            disabled={activeTab === 'details'}
          >&lt; Back</button>

          {activeTab !== 'dates' ? (
            <button
              type="button"
              className="btn btn-primary px-6 py-2"
              onClick={() => {
                if (activeTab === 'details') setActiveTab('budget')
                else if (activeTab === 'budget') setActiveTab('dates')
              }}
            >Next &gt;</button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || isLoading || !address}
              className="btn btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          )}
        </div>

        {!address && (
          <p className="text-center text-gray-500 text-sm">
            Please connect your wallet to create a campaign
          </p>
        )}
      </form>
    </div>
  );
}
