import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'

export let db;

async function setupDB() {
  const blockstore = new LevelBlockstore('./ipfs/blocks')
  const libp2p = await createLibp2p(Libp2pOptions)
  const ipfs = await createHelia({ libp2p, blockstore })
  const orbitdb = await createOrbitDB({ ipfs })
  
  db = await orbitdb.open('my-db')
  console.log('Database ready at:', db.address)
}

setupDB().catch(console.error)