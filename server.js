import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { IPFSAccessController } from '@orbitdb/core'
import express from 'express';
if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(event, params = {}) {
          super(event, params);
          this.detail = params.detail || null;
      }
  };
}

global.CustomEvent = CustomEvent; // Make it available globally

const app = express();
const PORT = process.env.PORT || 3000;
const REPLICA = process.env.REPLICA || false;
const DBADDR = process.env.DBADDR || null;
const MULTIADDR = process.env.MULTIADDR || null;
const NUM_REPLICAS = process.env.NUM_REPLICAS || 2;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`Hello from DB service running on port ${PORT}`);
});

//dockers bridge network - accept requests from external connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}/`);
});

export let db;
let ipfs;
let orbitdb;
let randDir = (Math.random() + 1).toString(36).substring(2)

//for setting up initial root db
async function setupDB() {
  const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
  console.log("poo")
  const libp2p = await createLibp2p(Libp2pOptions)
  console.log("poo1 ")
  ipfs = await createHelia({ libp2p, blockstore })

  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  
  db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({ write: ['*']}), type: 'documents' })
  console.log("poo2")
  console.log('Database ready at:', db.address, orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString())
  
  db.events.on('update', async (entry) => {
    // what has been updated.
    console.log('update from root: ', entry.payload.value)
  })

  await upsert("FUCK YEAH ROOT")

  let multiaddress = orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString();
  //DO NOT REMOVE - sends data back to parent for parsing for replica nodes
  console.log(`{"dbaddr": "${db.address}", "multiaddress": "${multiaddress}"}`)
}

//replica children
async function setupReplica() {
    
  const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
  const libp2p = await createLibp2p(Libp2pOptions)
  ipfs = await createHelia({ libp2p, blockstore })

  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  
  // dial into known stable node (root)
  await orbitdb.ipfs.libp2p.dial(multiaddr(MULTIADDR))
  console.log('opening db with ', DBADDR, ' dialling ', MULTIADDR)
  db = await orbitdb.open(DBADDR)

  await upsert("FUCK YEAH REPLICA")


}

if(REPLICA) {
  console.log('ssetting up replic')
  setupReplica().catch(console.error)
}
else {
  console.log('setting up root db')
  setupDB().catch(console.error)
}



function createBaseDocument(key) {
  // _id is a orbitdb specific thing so dont change this as the key
  return {
    _id: key,
    timestamp: new Date().getTime()
  }
}
//CRUD

// Update or Create if key isn't specified
export const upsert = async (value, key = randomUUID()) => {
  await db.put({ ...createBaseDocument(key), data: value })
  return key
}

// Read
export const read = async (key) => {
  return await db.get({_id: key})
}

// Delete
export const remove = async (key) => {
  await db.del({_id: key})
  return key
}

// getAllRecords
export async function getAllRecords() {
  if (!db) throw new Error('Database not initialized')
  return await db.all()
}

  // Clean up when stopping this app using ctrl+c
process.on('SIGINT', async () => {
  // Close your db and stop OrbitDB and IPFS.
  console.log("Closing db")
  await db.close()
  await orbitdb.stop()
  await ipfs.stop()

  process.exit(0)
})