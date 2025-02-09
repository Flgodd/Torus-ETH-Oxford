import {createLibp2p} from 'libp2p'
import {createHelia} from 'helia'
import {createOrbitDB, IPFSAccessController} from '@orbitdb/core'
import {LevelBlockstore} from 'blockstore-level'
import {Libp2pOptions} from './config/libp2p.js'
import {randomUUID} from 'crypto'
import {multiaddr} from '@multiformats/multiaddr'
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

const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
const libp2p = await createLibp2p(Libp2pOptions)

// Set up initial root DB
async function setupDB() {
    ipfs = await createHelia({libp2p, blockstore})
    orbitdb = await createOrbitDB({ipfs, directory: `./dbdata/${randDir}/orbitdb`})

    db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({write: ['*']}), type: 'keyvalue' })

    console.log('Database ready at:', db.address, orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString())
    db.events.on('update', async (entry) => console.log('update from root: ', entry.payload.value))
    await createData("LOG", "FUCK YEAH ROOT")
    let multiaddress = orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString();
    //DO NOT REMOVE - sends data back to parent for parsing for replica nodes
    console.log(`{"dbaddr": "${db.address}", "multiaddress": "${multiaddress}"}`)
}

// Replicate children
async function setupReplica() {
    ipfs = await createHelia({libp2p, blockstore})
    orbitdb = await createOrbitDB({ipfs, directory: `./dbdata/${randDir}/orbitdb`})
    // dial into known stable node (root)
    await orbitdb.ipfs.libp2p.dial(multiaddr(MULTIADDR))
    console.log('opening db with ', DBADDR, ' dialling ', MULTIADDR)
    db = await orbitdb.open(DBADDR)
    await createData("LOG", "FUCK YEAH REPLICA")
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
async function createData(key, value) {
    const hash = await db.put(key, value);
    const timestamp = Date.now();
    cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(value), timestamp);
    return hash
}

// ✅ Retrieve data from SQLite or OrbitDB
/* async function readData(key, nodelistLength) {
    const row = cache.prepare("SELECT value FROM cache WHERE key = ?").get(key);
    // update cache with current timestamp for this key
    cache.prepare("UPDATE cache SET updated_at = ? WHERE key = ?").run(Date.now(), key);
    
    for(let i = 1; i <= nodelistLength; i++){
        try{
            console.log("Forwarding request to child dbs")
            const response = await axios.post(`http://CHILDDB${i}/addToCache:3000`, { key: key, value: row.value });
            if(response.data) return response.data;
        }catch(error){
            console.error(`Error reading from CHILDDB${i}:`, error.message);
        }
    }

    if (row) return row.value;

    // If not in cache, fetch from OrbitDB

    // const value = await db.get({ _id: key });
    const value = await db.get(key);

    // const timestamp = Date.now();
    // if (readData) cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(readData), timestamp);
    return value;
} */

// ✅ Retrieve data from SQLite or OrbitDB
async function readData(key) {
    const row = cache.prepare("SELECT value FROM cache WHERE key = ?").get(key);
    if (row) return row.value;
    // If not in cache, fetch from OrbitDB

    // const value = await db.get({ _id: key });
    const value = await db.get(key);

    // const timestamp = Date.now();
    // if (readData) cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(readData), timestamp);
    return value;
}

// ✅ Store data and broadcast updates
async function updateData(key, data) {
    await db.put(key, data)
    return data;
}

async function deleteData(key) {
    await db.del(key)
    console.log("cuntcunt: ", key)
    cache.prepare("DELETE FROM cache WHERE key=?").run(key);

    // Broadcast delete to all replicas
    for(let i = 1; i <= nodelistLength; i++){
        try{
            await axios.post(`http://CHILDDB${i}/removeFromCache:3000`, { key: key });
        }catch(error){
            console.error(`Error deleting from CHILDDB${i}:`, error.message);
        }
    }
    return key
}

export {setupDB, teardownDB, createData, readData, updateData, deleteData};
