import express from 'express'
import cors from 'cors'
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'

const app = express()
app.use(cors())
app.use(express.json())

let db

async function setupDB() {
  const blockstore = new LevelBlockstore('./ipfs/blocks')
  const libp2p = await createLibp2p(Libp2pOptions)
  const ipfs = await createHelia({ libp2p, blockstore })
  const orbitdb = await createOrbitDB({ ipfs })
  
  db = await orbitdb.open('my-db')
  console.log('Database ready at:', db.address)
}

setupDB().catch(console.error)

//CRUD

// Create

export const add = async (value) => {
  return db.put({ value })
}

// Read
export const read = async (hash) => {
  return db.get(hash)
}

// Update
export const update = async (hash, value) => {
  return db.put(hash, { value })
}

// Delete
export const remove = async (hash) => {
  return db.del(hash)
}

app.get('/records', async (req, res) => {
  try {
    const records = await db.all()
    res.json({ records })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/records', async (req, res) => {
  try {
    const { value } = req.body
    if (!value) {
      return res.status(400).json({ error: 'Value is required' })
    }

    await db.add(value)
    res.json({ success: true, message: 'Record added' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
