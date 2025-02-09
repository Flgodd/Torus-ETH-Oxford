import axios from "axios";
import express from 'express';
import { createData, readData, updateData, deleteData, teardownDB } from "./database.js";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;
const MAP_PORT = process.env.MAP_PORT;
const BROKER_URL = "http://host.docker.internal:8030"; // Change if broker is on another machine
const CACHE_MAX_SIZE = 500;

app.use(express.json());

// Function to register with the broker
async function registerWithBroker() {
    try {
        const serverAddress = `localhost:${MAP_PORT}`; // Use localhost for easier testing
        await axios.post(`${BROKER_URL}/subscribe`, { serverAddress });
        console.log(`[Node at http://localhost:${MAP_PORT}] Successfully registered with broker`);
    } catch (error) {
        console.error(`[Node at http://localhost:${MAP_PORT}] Failed to register with broker:`, error.message);
    }
}


// ✅ Read data
app.post("/read", async (req, res) => {
    const { data } = req.body;

    const nodelist = await axios.get(`${BROKER_URL}/nodelist`);
    const value = await readData(data._id, nodelist);

    if (!value) return res.status(404).json({error: "Key not found"});
    res.json({ success: true, message: "Data retrieved successfully", data: value });
});

// ✅ Store data
app.post("/create", async (req, res) => {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: "Value required" });
    const key = await createData(value);
    res.json({ success: true, message: "Data stored successfully", key: key });
});

// ✅ Store data
app.post("/update", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Key and value required" });
    const data = await updateData(key, value);
    res.json({ success: true, message: "Data updated successfully", key: key, data: data });
});

// ✅ Remove data
app.delete("/delete", async (req, res) => {
    const { key } = req.body;
    await deleteData(key);
    res.json({ success: true, message: "Data stored successfully" });
});

// ✅ Check organelle health
app.get("/health", (req, res) => {
    res.sendStatus(200); // Responds with 200 OK if alive
});

const cache = new Database("./cache.sqlite");

app.post("/addToCache", (req, res) => {
    //check cache is not full, if so delete oldest entry
    const cacheSize = cache.prepare("SELECT COUNT(*) FROM cache").get();
    if(cacheSize >= CACHE_MAX_SIZE){
        const oldestEntry = cache.prepare("SELECT key FROM cache ORDER BY updated_at ASC LIMIT 1").get();
        cache.prepare("DELETE FROM cache WHERE key = ?").run(oldestEntry.key);
    }
    
    // Add to cache
    console.log("adding to cache")
    cache.prepare("INSERT INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(req.body.key, req.body.value, Date.now());
    res.json({ success: true, message: "Data stored successfully" });
})

app.post("/removeFromCache", (req, res) => {
    // Remove from cache
    cache.prepare("DELETE FROM cache WHERE key = ?").run(req.body.key);

    res.json({ success: true, message: "Data removed successfully" });
})

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
