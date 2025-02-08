import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import { randomUUID } from 'crypto'

export let db;

async function setupDB() {
  const blockstore = new LevelBlockstore('./ipfs/blocks')
  const libp2p = await createLibp2p(Libp2pOptions)
  const ipfs = await createHelia({ libp2p, blockstore })
  const orbitdb = await createOrbitDB({ ipfs })
  
  db = await orbitdb.open('my-db', { type: 'documents' })
  console.log('Database ready at:', db.address)
}

setupDB().catch(console.error)

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

const PORT = 3000
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
setupDB().catch(console.error)
