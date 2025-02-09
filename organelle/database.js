import {createLibp2p} from 'libp2p'
import {createHelia} from 'helia'
import {createOrbitDB, IPFSAccessController} from '@orbitdb/core'
import {LevelBlockstore} from 'blockstore-level'
import {Libp2pOptions} from './config/libp2p.js'
import {multiaddr} from '@multiformats/multiaddr'
import Database from "better-sqlite3";
import axios from 'axios'

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
const NODE_NUMBER = process.env.NODE_NUMBER || null;

const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
const libp2p = await createLibp2p(Libp2pOptions)

// Set up initial root DB
async function setupDB() {
    ipfs = await createHelia({libp2p, blockstore})
    orbitdb = await createOrbitDB({ipfs, directory: `./dbdata/${randDir}/orbitdb`})

    db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({write: ['*']}), type: 'keyvalue' })

    console.log('Database ready at:', db.address, orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString())
    db.events.on('update', async (entry) => console.log('update from root: ', entry.payload.value))
    await createData("LOG", "ROOT CREATED")
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
    await createData("LOG", "REPLICA CREATED")
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
         updated_at INTEGER
    );
`);

// ✅ Store data and broadcast updates
async function createData(key, value) {
    await db.put(key, value);
    // const timestamp = Date.now();
    // cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(value), timestamp);
    return key
}

// ✅ Retrieve data from SQLite or OrbitDB
async function readData(key, nodelistLength) {
    let finalVal
    const row = cache.prepare("SELECT value FROM cache WHERE key = ?").get(key);

    if (row) {
        // update cache with current timestamp for this key
        cache.prepare("UPDATE cache SET updated_at = ? WHERE key = ?").run(Math.floor(Math.floor(Date.now()/1000)/1000), key);
        finalVal = row.value;
    }
    {
        const timestamp = Math.floor(Date.now()/1000);
        finalVal = await db.get(key);
        cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(finalVal), timestamp);
    }

    for(let i = 0; i < nodelistLength; i++){
        if(NODE_NUMBER === i) continue;
        const url = i === 0 ? 'http://dbservice:3000/addToCache' : `http://CHILDDB${i}:3000/addToCache`;
        try{
            await axios.post(url, { key: key, value: finalVal, num: i });
        }catch(error){
            console.error(`Error reading from CHILDDB${i}:`, error.message);
        }
    }

    return finalVal;
}

// ✅ Store data and broadcast updates
async function updateData(key, data) {
    await db.put(key, data)
    // cache.prepare("INSERT OR REPLACE INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(data), timestamp);
    return data;
}

async function deleteData(key, nodeListLength) {
    await db.del(key)
    cache.prepare("DELETE FROM cache WHERE key=?").run(key);

    // Broadcast delete to all replicas
    for(let i = 0; i < nodeListLength; i++){
        if(NODE_NUMBER === i) continue;
        const url = i === 0 ? 'http://dbservice:3000/removeFromCache' : `http://CHILDDB${i}:3000/removeFromCache`;

        try{
            const resp = await axios.post(url, { key: key, num: i });
        }catch(error){
            console.error(`Error deleting from CHILDDB${i}:`, error.message);
        }
    }
    return key
}

export {setupDB, teardownDB, createData, readData, updateData, deleteData};
