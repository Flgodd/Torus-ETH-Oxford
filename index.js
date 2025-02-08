import express from 'express';
import { ethers } from 'ethers';
import { readFile } from "fs/promises";
import {db} from './server.js';
import { add, read, update, remove, getAllRecords } from './server.js'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function checkAuth(username){
    const users = readFile('users.txt', 'utf8');
    return users.includes(username);
}

const challenges = {};

app.get('/', async (req, res) => {
    const { username } = req.body;

    res.send('Hello, TypeScript!');

    if (checkAuth(username)) {
        res.send('Authenticated!');
    }
    else {
        res.send('Not authenticated - call /authenticate');
    }

});


app.get('/authenticate', (req, res) => {
    //TODO check if user has been authenticated before

    const { walletAddress } = req.body;
    
    if (!walletAddress) {
        res.status(400).json({ error: "Missing wallet address" });
    }

    // Generate a unique challenge message
    const challenge = `Sign this message to prove ownership: ${Date.now()}`;
    
    // Store it temporarily (map it to walletAddress)
    challenges[walletAddress] = challenge;

    res.json({ challenge });
});

app.post("/verify-signature", (req, res) => {
    const { walletAddress, signedMessage } = req.body;

    if (!walletAddress || !signedMessage) {
         res.status(400).json({ error: "Missing parameters" });
    }

    const originalMessage = challenges[walletAddress];
    if (!originalMessage) {
         res.status(400).json({ error: "Challenge expired or not found" });
    }

    try {
        // Recover the signer address from the signed message
        const recoveredAddress = ethers.verifyMessage(originalMessage, signedMessage);

        if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
            delete challenges[walletAddress]; // Clear used challenge
            res.json({ success: true, message: "Signature verified!" });
        } else {
            res.status(401).json({ error: "Signature mismatch!" });
        }
    } catch (error) {
        res.status(500).json({ error: "Signature verification failed", details: error });
    }
});


app.post('/read', async (req, res) => {
  const { key } = req.params;
  const { username } = req.body;

    if(!checkAuth(username)) {
      res.status(401).json({ error: 'Not authenticated - call /authenticate' })
    }

    try {
      const records = await read(key)
      res.json({ records })
    } catch (error) {
      res.status(500).json({ error: error })
    }
  })

  app.post('/upsert', async (req, res) => {
    const { key } = req.params;
    const { username, value } = req.body;
  
      if(!checkAuth(username)) {
        res.status(401).json({ error: 'Not authenticated - call /authenticate' })
      }
  
      try {
        let insertedKey
        if(!key){
          insertedKey = await upsert(value)
        }
        else{
          insertedKey = await upsert(value, key)
        }

        res.json({ insertedKey })
      } catch (error) {
        res.status(500).json({ error: error })
      }
    })

  app.post('/remove', async (req, res) => {
    const { key } = req.params;
    const { username } = req.body;
  
      if(!checkAuth(username)) {
        res.status(401).json({ error: 'Not authenticated - call /authenticate' })
      }
  
      try {
        const insertedKey = await remove(key)

        res.json({ insertedKey })
      } catch (error) {
        res.status(500).json({ error: error })
      }
    })

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)});