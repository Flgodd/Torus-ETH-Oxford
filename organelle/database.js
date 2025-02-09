import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { IPFSAccessController } from '@orbitdb/core'

//i dont know why we need this at all
if (typeof globalThis.CustomEvent === "undefined") {
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(event, params = {}) {
            super(event, params);
            this.detail = params.detail || null;
        }
    };
  }
  
global.CustomEvent = CustomEvent; // Make it available globally

import { sqlite3 } from "sqlite3";
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'
import { multiaddr } from '@multiformats/multiaddr'

let ipfs;
let orbitdb;
let randDir = (Math.random() + 1).toString(36).substring(2)
export let db;

const REPLICA = process.env.REPLICA || false;
const DBADDR = process.env.DBADDR || null;
const MULTIADDR = process.env.MULTIADDR || null;
const CACHE_MAX_SIZE = 500;

const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
const libp2p = await createLibp2p(Libp2pOptions)

// Set up initial root DB
async function setupDB() {
  ipfs = await createHelia({ libp2p, blockstore })
  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  
  db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({ write: ['*']}), type: 'documents' })
  console.log('Database ready at:', db.address, orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString())
  db.events.on('update', async (entry) => console.log('update from root: ', entry.payload.value))
  await upsert("FUCK YEAH ROOT")
  let multiaddress = orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString();
  //DO NOT REMOVE - sends data back to parent for parsing for replica nodes
  console.log(`{"dbaddr": "${db.address}", "multiaddress": "${multiaddress}"}`)
}

// Replicate children
async function setupReplica() {
  ipfs = await createHelia({ libp2p, blockstore })
  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  // dial into known stable node (root)
  await orbitdb.ipfs.libp2p.dial(multiaddr(MULTIADDR))
  console.log('opening db with ', DBADDR, ' dialling ', MULTIADDR)
  db = await orbitdb.open(DBADDR)
  await upsert("FUCK YEAH REPLICA")
}

if(REPLICA) {
  console.log('setting up replica')
  setupReplica().catch(console.error)
} else {
  console.log('setting up root db')
  setupDB().catch(console.error)
}

async function teardownDB() {
  await db.close()
  await orbitdb.stop()
  await ipfs.stop()
}

function createBaseDocument(key) {
  // _id is a orbitdb specific thing so dont change this as the key
  return {
    _id: key,
    timestamp: new Date().getTime()
  }
}

// Update or Create if key isn't specified
export const upsert = async (value, key = randomUUID()) => {
  await db.put({ ...createBaseDocument(key), data: value })
  return key
}










// ✅ Open SQLite database (cache)
const cache = await open({
  filename: "./db/cache.sqlite",
  driver: sqlite3.Database
});

// ✅ Create table if not exists
await cache.exec(`
    CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);

// ✅ Store data and broadcast updates
async function createData(key, value) {
  await db.put(key, value);  // Update OrbitDB
  await cache.run("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, value]);
}

// ✅ Retrieve data from SQLite or OrbitDB
async function readData(key) {
  const row = await cache.get("SELECT value FROM cache WHERE key = ?", [key]);
  if (row) return row.value;

  // If not in cache, fetch from OrbitDB
  const value = await db.get(key);
  if (value) await createData(key, value);
  return value;
}

// ✅ Update data and broadcast updates
async function updateData(key, value) {
  await db.put(key, value);  // Update OrbitDB
  await cache.run("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, value]);
}

async function deleteData(key) {
  await db.del({_id: key})
  return key
}

export { setupDB, teardownDB };
export { readData, createData, deleteData };
