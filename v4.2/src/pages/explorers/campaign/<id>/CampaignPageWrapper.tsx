import React from 'react';
import { useParams } from 'react-router-dom';
import { CampaignProvider } from '@/context/CampaignContext';
import CampaignViewWithContext from './CampaignViewWithContext';

export default function CampaignPageWrapper() {
  const { id } = useParams();
  const campaignId = id ? BigInt(id) : BigInt(0);

  return (
    <CampaignProvider campaignId={campaignId}>
      <CampaignViewWithContext />
    </CampaignProvider>
  );
} 