#!/usr/bin/env tsx

import { MongoClient, ServerApiVersion } from 'mongodb'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || ''

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...')
  console.log('📋 Connection String:', DATABASE_URL ? 'Set' : 'Not set')
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.log('💡 Please check your .env file')
    process.exit(1)
  }

  let client: MongoClient | null = null
  
  try {
    console.log('🔌 Attempting to connect to MongoDB...')
    
    client = new MongoClient(DATABASE_URL, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    })

    // Test connection
    await client.connect()
    console.log('✅ Successfully connected to MongoDB!')

    // Test database access
    const db = client.db()
    console.log('📊 Database name:', db.databaseName)

    // Test collections
    const collections = await db.listCollections().toArray()
    console.log('📁 Available collections:', collections.map(c => c.name))

    // Test basic operations
    const testCollection = db.collection('connection_test')
    
    // Insert test document
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Connection test successful'
    }
    
    const insertResult = await testCollection.insertOne(testDoc)
    console.log('📝 Test document inserted:', insertResult.insertedId)

    // Read test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId })
    console.log('📖 Test document retrieved:', foundDoc ? 'Success' : 'Failed')

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId })
    console.log('🧹 Test document cleaned up')

    // Test collections that the app uses
    const requiredCollections = ['advertisers', 'publishers', 'campaigns', 'events']
    console.log('🔍 Checking required collections...')
    
    for (const collectionName of requiredCollections) {
      const collection = db.collection(collectionName)
      const count = await collection.countDocuments()
      console.log(`   ${collectionName}: ${count} documents`)
    }

    console.log('🎉 All connection tests passed!')
    console.log('✅ MongoDB is ready for use')

  } catch (error) {
    console.error('❌ MongoDB connection failed:')
    console.error('   Error:', error instanceof Error ? error.message : 'Unknown error')
    
    if (error instanceof Error) {
      if (error.message.includes('ETIMEOUT')) {
        console.log('💡 This might be a network timeout. Check your internet connection.')
      } else if (error.message.includes('authentication')) {
        console.log('💡 Authentication failed. Check your username and password.')
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('💡 Host not found. Check your cluster URL.')
      }
    }
    
    console.log('🔧 Troubleshooting tips:')
    console.log('   1. Verify your DATABASE_URL in .env file')
    console.log('   2. Check if your IP is whitelisted in MongoDB Atlas')
    console.log('   3. Ensure your database user has proper permissions')
    console.log('   4. Verify your cluster is running')
    
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Connection closed')
    }
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('✨ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
