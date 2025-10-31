#!/usr/bin/env node

import { initializeAnalytics } from '@/lib/analytics'
import { initializeOracle } from '@/lib/oracle'

async function main() {
  console.log('🚀 Starting SovAds System...')
  
  try {
    // Initialize analytics workers
    console.log('📊 Initializing analytics workers...')
    await initializeAnalytics()
    
    // Initialize oracle service
    console.log('🔮 Initializing oracle service...')
    await initializeOracle()
    
    console.log('✅ SovAds System started successfully!')
    console.log('📱 Frontend: http://localhost:3000')
    console.log('📊 Admin: http://localhost:3000/admin')
    console.log('📖 SDK Demo: http://localhost:3000/sdk-demo.html')
    
  } catch (error) {
    console.error('❌ Failed to start SovAds System:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down SovAds System...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down SovAds System...')
  process.exit(0)
})

main().catch(console.error)