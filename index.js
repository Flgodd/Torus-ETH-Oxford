import express from 'express';
import { ethers } from 'ethers';
import { readFile } from "fs/promises";
import {db} from './server.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const challenges = {};

app.get('/', async (req, res) => {
    const { username } = req.body;

    res.send('Hello, TypeScript!');
    const users = await readFile('users.txt', 'utf8');

    if (users.includes(username)){
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


app.get('/records', async (req, res) => {
    try {
      const records = await db.all()
      res.json({ records })
    } catch (error) {
      res.status(500).json({ error: error })
    }
  })
  
  app.post('/records', async (req, res) => {
    try {
      const { value } = req.body
      if (!value) {
        res.status(400).json({ error: 'Value is required' })
      }
  
      await db.add(value)
      res.json({ success: true, message: 'Record added' })
    } catch (error) {
      res.status(500).json({ error: error })
    }
  })

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});