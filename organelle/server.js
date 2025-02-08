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

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`Hello from DB service running on port ${PORT}`);
});

app.get('/retrieve', (req, res) => {
  const { key } = req.query;
  res.send(`Hello from DB service running on port ${PORT}`);
});

//dockers bridge network - accept requests from external connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}/`);
});

