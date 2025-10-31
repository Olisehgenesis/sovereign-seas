import 'server-only'
export interface CampaignFormData {
  name: string;
  description: string;
  bannerUrl: string;
  targetUrl: string;
  budget: string;
  cpc: string;
  duration: string;
  tokenAddress: string;
}

export async function saveCampaign(params: {
  wallet: `0x${string}`;
  campaignData: CampaignFormData;
  transactionHash: `0x${string}`;
  contractCampaignId: string;
}) {
  const response = await fetch('/api/campaigns/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let message = 'Failed to save campaign to database';
    try {
      const data = await response.json();
      message = data?.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

import { MongoClient, ServerApiVersion, type Db, type Collection } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

const DATABASE_URL = process.env.DATABASE_URL || ''

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb
  
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  
  if (!cachedClient) {
    cachedClient = new MongoClient(DATABASE_URL, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
      connectTimeoutMS: 10000, // 10 second timeout
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    })
    
    try {
      await cachedClient.connect()
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error)
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  cachedDb = cachedClient.db()
  return cachedDb
}

export async function getCollections() {
  try {
    const db = await getDb()
    return {
      advertisers: db.collection('advertisers') as Collection,
      publishers: db.collection('publishers') as Collection,
      campaigns: db.collection('campaigns') as Collection,
      events: db.collection('events') as Collection,
    }
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

// Graceful shutdown (best-effort)
process.on('beforeExit', async () => {
  try {
    if (cachedClient) await cachedClient.close()
  } catch {}
})