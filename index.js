import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady, signatureVerify, isAddress } from "@polkadot/util-crypto";
import { hexToU8a, stringToU8a } from "@polkadot/util";
import jwt from "jsonwebtoken";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET

app.use(express.json());
app.use(cors());
const keyring = new Keyring({ type: "sr25519" });

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname)));

// Serve the landing page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Validate wallet adress
app.post("/validate-wallet", async (req, res) => {
  const { walletAddress } = req.body;

  try {
    const isvalid = isAddress(walletAddress);
    if (!isvalid) {
      return res.json({ valid: false, message: "Invalid Polkadot address" });
    }
  res.json({ valid: true });
  }
  catch (error) {
    console.error("🚨 Address Validation Error:", error.message);
    res.json({ valid: false, message: "Invalid address format" });
}

});

// ✅ Generate Authentication Challenge
app.post("/authenticate", async (req, res) => {
  const { walletAddress } = req.body;
  const challenge = `Sign this message to prove ownership: ${walletAddress}-${Date.now()}`;
  res.json({ challenge });
});

app.post("/verify-signature", async (req, res) => {
  const { walletAddress, signedMessage, challenge } = req.body;

  console.log("📝 Wallet Address:", walletAddress);
  console.log("📝 Signed Message (Hex):", signedMessage);
  console.log("📝 Challenge Message:", challenge);

  try {
      await cryptoWaitReady(); // Ensure crypto functions are initialized

      // ✅ Convert Signature (Hex -> Uint8Array)
      const signatureU8a = hexToU8a(signedMessage);

      // ✅ Convert Challenge (String -> Uint8Array)
      const challengeU8a = stringToU8a(challenge);

      // ✅ Initialize Keyring and Decode Wallet Address
      const keyring = new Keyring({ type: "sr25519" }); // Ensure using correct keyring type
      const publicKey = keyring.decodeAddress(walletAddress); // Convert wallet address to public key

      // ✅ Verify Signature
      const { isValid } = signatureVerify(challengeU8a, signatureU8a, publicKey);

      if (!isValid) {
          return res.status(401).json({ error: "Signature verification failed!" });
      }

      // ✅ Generate JWT for Authentication
      const token = jwt.sign({ walletAddress }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ success: true, token });

  } catch (error) {
      res.status(500).json({ error: "Verification error", details: error.message });
  }
});


// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
