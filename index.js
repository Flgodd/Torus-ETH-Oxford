import express from "express";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1h";

app.use(express.json());
app.use(cors());

// Generate JWT Token
function generateToken(walletAddress) {
  return jwt.sign({ walletAddress }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
}

// Get the directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//  Welcome Route
app.get("/", (req, res) => {
  // res.send("Welcome to the Agent Authentication API! Use /authenticate to start.");
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication Challenge 
app.post("/authenticate", async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  // Generate a One-Time Challenge 
  const challenge = `Sign this message to prove ownership: ${walletAddress}-${Date.now()}`;

  res.json({ challenge });
});

// Verify Signature and Issue JWT
app.post("/verify-signature", async (req, res) => {
  const { walletAddress, signedMessage, challenge } = req.body;

  if (!walletAddress || !signedMessage || !challenge) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    // Recover Address from Signature
    const recoveredAddress = ethers.verifyMessage(challenge, signedMessage);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature mismatch!" });
    }

    // Generate JWT
    const token = generateToken(walletAddress);
    return res.json({ success: true, message: "Authentication successful!", token });
  } catch (error) {
    return res.status(500).json({ error: "Signature verification failed", details: error.message });
  }
});

// Middleware: Authenticate Requests Using JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.locals = { walletAddress: decoded.walletAddress };
    next();
  });
}

// Protected Route (Only Authenticated Agents Can Access)
app.get("/secure-data", authenticateToken, async (req, res) => {
  return res.json({ success: true, data: `This is protected data for ${req.locals.walletAddress}` });
});



app.get('/records', async (req, res) => {
    try {
      const records = await db.getAllRecords()
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
  
      await add(value)
      res.json({ success: true, message: 'Record added' })
    } catch (error) {
      res.status(500).json({ error: error })
    }
  })

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});