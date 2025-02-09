import axios from "axios";
import express from 'express';
import { teardownDB } from "./database.js";
import { upsertData, readData, deleteData } from "./database.js";
import dotenv from 'dotenv';
dotenv.config();

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
const PORT = process.env.PORT;
const MAP_PORT = process.env.MAP_PORT;
const BROKER_URL = `http://localhost:${BROKER_PORT}`; // Change if broker is on another machine

app.use(express.json());

// Function to register with the broker
async function registerWithBroker() {
    try {
        const serverAddress = `http://localhost:${MAP_PORT}`; // Use localhost for easier testing
        await axios.post(`${BROKER_URL}/subscribe`, { serverAddress });
        console.log(`[Node at http://localhost:${MAP_PORT}] Successfully registered with broker`);
    } catch (error) {
        console.error(`[Node at http://localhost:${MAP_PORT}] Failed to register with broker:`, error.message);
    }
}

// ✅ Read data
app.get("/read", async (req, res) => {
    const {key} = req.params;
    const value = await readData(key);
    if (!value) return res.status(404).json({error: "Key not found"});
});

// ✅ Store data
app.post("/create", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Key and value required" });
    await upsertData(key, value);
    res.json({ success: true, message: "Data stored successfully" });
});

// ✅ Store data
app.post("/update", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Key and value required" });
    await updateData(key, value);
    res.json({ success: true, message: "Data updated successfully" });
});

// ✅ Remove data - NEEDS A SECOND LOOK
app.delete("/delete", async (req, res) => {
    const { key } = req.body;
    await deleteData(key);
    res.json({ success: true, message: "Data stored successfully" });
});

// ✅ Check organelle health
app.get("/health", (req, res) => {
    res.sendStatus(200); // Responds with 200 OK if alive
});

// Clean up when stopping this app using ctrl+c
process.on('SIGINT', async () => {
    // Close your db and stop OrbitDB and IPFS.
    console.log("Closing db")
    await teardownDB();
    process.exit(0)
})

// Dockers bridge network - accept requests from external connections
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}/`);
    await registerWithBroker();
});
