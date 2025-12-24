import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egov_test6'

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let client
let clientPromise

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export default clientPromise
