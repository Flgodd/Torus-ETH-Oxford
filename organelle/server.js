import axios from "axios";
import express from 'express';
import { createData, readData, updateData, deleteData, teardownDB } from "./database.js";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;
const MAP_PORT = process.env.MAP_PORT;
const BROKER_URL = "http://host.docker.internal:8030"; // Change if broker is on another machine
const CACHE_MAX_SIZE = 500;
let nodeListLength = 0;

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

async function pollNodeListLength() {
    try {
        const response = await axios.get(`${BROKER_URL}/nodelistLength`);
        let { length } = response.data;
        nodeListLength = length;
        console.log(`[Node at http://localhost:${MAP_PORT}] NodeList length: ${nodeListLength}`);
    } catch (error) {
        console.error(`[Node at http://localhost:${MAP_PORT}] Failed to get NodeList length:`, error.message);
    }
}

setInterval(pollNodeListLength, 500000);


// ✅ Read data
app.get("/read", async (req, res) => {
  const key = req.query.key;
  const value = await readData(key, nodeListLength);
  if (!value) return res.status(404).json({ error: "Key not found" });
  res.json({ success: true, message: "Data read successfully", key: key, data: value });
});

// ✅ Store data
app.post("/create", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "A key and a value are required" });
    const hash = await createData(key, value);
    res.json({ success: true, message: "Data created successfully", hash: hash, key: key, data: value });
});

// ✅ Store data
app.post("/update", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Key and value required" });
    await updateData(key, value);
    res.json({ success: true, message: "Data updated successfully", key: key, data: value });
});

// ✅ Remove data
app.post("/delete", async (req, res) => {
    const { key } = req.body;
    console.log("cunt; ", key)
    await deleteData(key, nodeListLength);
    res.json({ success: true, message: "Data deleted successfully", key: key });
});

// ✅ Check organelle health
app.get("/health", (req, res) => {
    res.sendStatus(200); // Responds with 200 OK if alive
});

const cache = new Database("./cache.sqlite");

app.post("/addToCache", (req, res) => {
    const { key, value } = req.body
    //check if the key is in the cache first, if so update timestamp
    const exists = cache.prepare("SELECT EXISTS (SELECT 1 FROM cache WHERE key = ?) AS key_exists").get(key);

    if(exists.key_exists) {
        console.log("Cache item exists, resetting updated at ", exists)
        //then update the timestamp of the cache item
        cache.prepare("UPDATE cache SET updated_at = ? WHERE key = ?").run(Math.floor(Date.now()/1000), key);
    }
    else {
        console.log("Cache item being added")
        //check cache is not full, if so delete oldest entry
        const cacheSize = cache.prepare("SELECT COUNT(*) FROM cache").get();
        if(cacheSize >= CACHE_MAX_SIZE){
            const oldestEntry = cache.prepare("SELECT key FROM cache ORDER BY updated_at ASC LIMIT 1").get();
            cache.prepare("DELETE FROM cache WHERE key = ?").run(oldestEntry.key);
        }
        
        // Add to cache
        console.log("adding to cache ", key, value)
        cache.prepare("INSERT INTO cache (key, value, updated_at) VALUES (?, ?, ?)").run(key, JSON.stringify(value), Math.floor(Date.now()/1000));
    }

    res.json({ success: true, message: "Data stored successfully" });

})

app.post("/removeFromCache", (req, res) => {
    const { key } = req.body;
    // Remove from cache
    cache.prepare("DELETE FROM cache WHERE key = ?").run(key);

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
    setTimeout(() => 500);
    await pollNodeListLength();
});
