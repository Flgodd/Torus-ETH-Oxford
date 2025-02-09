import { teardownDB } from "./database.js";
import { createData, readData, deleteData } from "./database.js";
import express from 'express';
import {db} from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;
const BROKER_URL = '';

app.use(express.json());

// Dockers bridge network - accept requests from external connections
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}/`);
    await registerWithBroker();
});

// ✅ Root endpoint
app.get('/', (req, res) => {
    res.send(`Hello! Organelle running on port ${PORT}`);
});

// ✅ Check organelle health
app.get("/health", (req, res) => {
    res.sendStatus(200); // Responds with 200 OK if alive
});

// ✅ Retrieve data
app.get("/read", async (req, res) => {
    const {key} = req.params;
    const value = await readData(key);
    if (!value) return res.status(404).json({error: "Key not found"});
});

// ✅ Store data
app.post("/create", async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Key and value required" });
    await createData(key, value);
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

// Function to register with the broker
async function registerWithBroker() {
    try {
        const serverAddress = `localhost:${port}`; // Use localhost for easier testing
        await axios.post(`${BROKER_URL}/subscribe`, { serverAddress });
        console.log(`[Node ${port}] Successfully registered with broker`);
    } catch (error) {
        console.error(`[Node ${port}] Failed to register with broker:`, error.message);
    }
}

// Clean up when stopping this app using ctrl+c
process.on('SIGINT', async () => {
    // Close your db and stop OrbitDB and IPFS.
    console.log("Closing db")
    await teardownDB();
    process.exit(0)
})
