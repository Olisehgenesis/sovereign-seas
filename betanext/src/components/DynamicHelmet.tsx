
'use client';
import React from 'react';

import { Helmet } from 'react-helmet-async';

interface MetadataConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  siteName?: string;
}

interface DynamicHelmetProps {
  config: MetadataConfig;
}

const DynamicHelmet: React.FC<DynamicHelmetProps> = ({ config }) => {
  const {
    title,
    description,
    image = '/og-image.png',
    url = typeof window !== 'undefined' ? window.location.href : '',
    type = 'app',
    siteName = 'Sov Seas'
  } = config;

  const fullTitle = `${title} | ${siteName}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="blockchain, funding, campaigns, decentralized, voting, projects, Celo" />
      
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />
    </Helmet>
  );
};

export default DynamicHelmet;
