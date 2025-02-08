import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'
import { multiaddr } from '@multiformats/multiaddr'
import { IPFSAccessController } from '@orbitdb/core'

export let db;
let ipfs;
let orbitdb;
//for setting up initial root db
async function setupDB() {
  let randDir = (Math.random() + 1).toString(36).substring(2)
    
  const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
  const libp2p = await createLibp2p(Libp2pOptions)
  ipfs = await createHelia({ libp2p, blockstore })

  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  
  db = await orbitdb.open('my-db', { AccessController: IPFSAccessController({ write: ['*']}), type: 'documents' })
  
  console.log('Database ready at:', db.address, orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString())
  
  process.send({ dbaddr: db.address, multiaddress: orbitdb.ipfs.libp2p.getMultiaddrs()[0].toString() })

  db.events.on('update', async (entry) => {
    // what has been updated.
    console.log('update', entry.payload.value)
  })

  await upsert("FUCK YEAH ROOT")
}

//replica children
async function setupReplica() {
  let multiaddress = process.argv[3], dbaddr = process.argv[2]
  let randDir = (Math.random() + 1).toString(36).substring(2)
    
  const blockstore = new LevelBlockstore(`./dbdata/${randDir}/ipfs/blocks`)
  const libp2p = await createLibp2p(Libp2pOptions)
  ipfs = await createHelia({ libp2p, blockstore })

  orbitdb = await createOrbitDB({ ipfs, directory: `./dbdata/${randDir}/orbitdb` })
  
  await orbitdb.ipfs.libp2p.dial(multiaddr(multiaddress))
  console.log('opening db with ', dbaddr, ' dialling ', multiaddress)
  db = await orbitdb.open(dbaddr)

  await upsert("FUCK YEAH REPLICA")
}

if(process.argv[2] && process.argv[3]) {
  setupReplica().catch(console.error)
}
else {
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
  await db.close()
  await orbitdb.stop()
  await ipfs.stop()

  process.exit()
})