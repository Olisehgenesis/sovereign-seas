import { MongoClient, Db, Collection, Document } from 'mongodb'

declare global {
  var __sovads_mongo_client: MongoClient | undefined
  var __sovads_mongo_db: Db | undefined
}

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set')
}

// TypeScript type narrowing: after the check above, uri is guaranteed to be a string
const mongoUri: string = uri

const dbName = process.env.MONGODB_DB || 'sovads'

async function initializeClient(): Promise<MongoClient> {
  if (global.__sovads_mongo_client) {
    return global.__sovads_mongo_client
  }

  const client = new MongoClient(mongoUri)
  await client.connect()

  if (process.env.NODE_ENV !== 'production') {
    global.__sovads_mongo_client = client
  }

  return client
}

export async function getMongoClient(): Promise<MongoClient> {
  if (global.__sovads_mongo_client) {
    return global.__sovads_mongo_client
  }

  return initializeClient()
}

export async function getDatabase(): Promise<Db> {
  if (global.__sovads_mongo_db) {
    return global.__sovads_mongo_db
  }

  const client = await getMongoClient()
  const db = client.db(dbName)

  if (process.env.NODE_ENV !== 'production') {
    global.__sovads_mongo_db = db
  }

  return db
}

export async function getCollection<TSchema extends Document>(name: string): Promise<Collection<TSchema>> {
  const db = await getDatabase()
  return db.collection<TSchema>(name)
}

