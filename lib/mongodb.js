// lib/mongodb.js - Cached MongoDB connection client singleton for Next.js App Router
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

function getMongoUri() {
  // Check if .env.local has been updated dynamically
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/^MONGODB_URI=(.+)$/m);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
  } catch (err) {
    // Ignore file read error and fall back to process.env
  }
  return process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cadence";
}

const options = {
  connectTimeoutMS: 8000,
  serverSelectionTimeoutMS: 8000,
};

export async function getDatabase() {
  const currentUri = getMongoUri();

  if (global._activeMongoUri !== currentUri || !global._mongoClientPromise) {
    global._activeMongoUri = currentUri;
    const client = new MongoClient(currentUri, options);
    global._mongoClientPromise = client.connect();
    console.log("[MongoDB Client] Connecting to:", currentUri.replace(/:([^:@]+)@/, ":****@"));
  }

  const connectedClient = await global._mongoClientPromise;
  return connectedClient.db();
}

export const getDb = getDatabase;
export default getDatabase;
