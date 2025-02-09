import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'
import { multiaddr } from '@multiformats/multiaddr'
import Database from "better-sqlite3";

if (typeof globalThis.CustomEvent === "undefined") {
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(event, params = {}) {
            super(event, params);
            this.detail = params.detail || null;
        }
    };
  }
  
  global.CustomEvent = CustomEvent; // Make it available globally

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
  await createData("FUCK YEAH ROOT")
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
  await createData("FUCK YEAH REPLICA")
}

if (REPLICA) {
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
  cache.close();
}







// ✅ Open database
const cache = new Database("./cache.sqlite");

// ✅ Create a table
cache.exec(`
    CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
`);

// ✅ Store data and broadcast updates
async function createData(data) {
  const key = randomUUID();
  const timestamp = Date.now();
  await db.put({ _id: key, value: data, timestamp: timestamp })
  cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, data, timestamp);
}

// ✅ Retrieve data from SQLite or OrbitDB
async function readData(key) {
  const row = cache.prepare("SELECT value FROM cache WHERE key = ?").get(key);
  if (row) return row.value;

  // If not in cache, fetch from OrbitDB
  const timestamp = Date.now();
  const data = await db.get({_id: key});
  if (data) cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, data, timestamp);
  return data;
}

// ✅ Store data and broadcast updates
async function updateData(key, data) {
  const timestamp = Date.now();
  await db.put({ _id: key, value: data, timestamp: timestamp })
  cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, data, timestamp);
}

async function deleteData(key) {
  await db.del({_id: key})
  cache.prepare("DELETE FROM cache WHERE key=?").run(key);
  return key
}

export { setupDB, teardownDB, createData, readData, updateData, deleteData };
