'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAds } from '../../hooks/useAds';

interface CampaignFormData {
  name: string;
  description: string;
  bannerUrl: string;
  targetUrl: string;
  budget: string;
  cpc: string;
  duration: string; // in days
  tokenAddress: string;
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
    cpc: '',
    duration: '',
    tokenAddress: ''
  });
  
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
    if (!formData.bannerUrl.trim()) return 'Banner URL is required';
    if (!formData.targetUrl.trim()) return 'Target URL is required';
    if (!formData.budget || parseFloat(formData.budget) < 0.0001) return 'Budget must be at least 0.0001';
    if (!formData.cpc || parseFloat(formData.cpc) < 0.0001) return 'CPC must be at least 0.0001';
    if (!formData.duration || parseInt(formData.duration) <= 0) return 'Duration must be greater than 0';
    if (!formData.tokenAddress) return 'Token address is required';
    
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
        createdAt: new Date().toISOString()
      });

      // Step 1: Create campaign on contract first
      console.log('Creating campaign on contract...');
      const txHash = await createCampaign(
        formData.tokenAddress,
        formData.budget,
        parseInt(formData.duration) * 24 * 60 * 60, // Convert days to seconds
        metadata
      );

      console.log('Campaign created on contract successfully');

      // Step 2: Save to database after successful contract interaction
      console.log('Saving campaign to database...');
      
      const resp = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address as `0x${string}`,
          campaignData: formData,
          transactionHash: txHash,
          contractCampaignId: campaignId,
        }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save campaign to database')
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
        cpc: '',
        duration: '',
        tokenAddress: supportedTokens[0] || ''
      });

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
      <h1 className="text-3xl font-bold text-foreground mb-6">Create New Campaign</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Banner Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">Banner Image *</nlabel>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                try {
                  const form = new FormData()
                  form.append('image', file)
                  const res = await fetch('/api/uploads/image', { method: 'POST', body: form })
                  if (!res.ok) throw new Error('Upload failed')
                  const data = await res.json()
                  setFormData(prev => ({ ...prev, bannerUrl: data.url }))
                  setBannerPreview(data.url)
                } catch (err) {
                  console.error('Upload error', err)
                  setSubmitError('Failed to upload image')
                } finally {
                  setUploading(false)
                }
              }}
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
              required
            />
          </div>
          {uploading && <p className="text-sm text-foreground/60 mt-2">Uploading...</p>}
          {bannerPreview && (
            <div className="mt-3">
              <img src={bannerPreview} alt="Banner preview" className="max-h-32 rounded-md border border-border" />
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

        {/* Budget and CPC */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-foreground/80 mb-2">
              Budget (ETH) *
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
              Cost Per Click (ETH) *
            </label>
            <input
              type="number"
              id="cpc"
              name="cpc"
              value={formData.cpc}
              onChange={handleInputChange}
              step="0.0001"
              min="0.0001"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.01"
              required
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-foreground/80 mb-2">
            Campaign Duration (Days) *
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            min="1"
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="30"
            required
          />
        </div>

        {/* Token Address */}
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
            {supportedTokens.map((token, index) => (
              <option key={index} value={token}>
                {token.slice(0, 6)}...{token.slice(-4)} ({index === 0 ? 'ETH' : `Token ${index}`})
              </option>
            ))}
          </select>
        </div>

        {/* Error Messages */}
        {(error || submitError) && (
          <div className="bg-red-100 border border-red-300 rounded-md p-4">
            <p className="text-red-700">{error || submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoading || !address}
          className="w-full btn btn-primary py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
        </button>

        {!address && (
          <p className="text-center text-gray-500 text-sm">
            Please connect your wallet to create a campaign
          </p>
        )}
      </form>
    </div>
  );
}
