import express from "express";
import axios from "axios";
import os from "os";

const app = express();
const port = process.env.PORT || Math.floor(9000 + Math.random() * 1000);
const BROKER_URL = "http://localhost:8030"; // Change if the broker is on another machine

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.sendStatus(200); // Responds with 200 OK if alive
});

// Handle forwarded CRUD requests
app.post("/handleRequest", (req, res) => {
  console.log(`[Node ${port}] Received request:`, req.body);
  res.json({ msg: "Request handled", data: req.body });
});

// Function to register with the broker
async function registerWithBroker() {
  try {
    const serverAddress = `${os.hostname()}:${port}`; // Unique identifier for the node
    await axios.post(`${BROKER_URL}/subscribe`, { serverAddress });
    console.log(`[Node ${port}] Successfully registered with broker`);
  } catch (error) {
    console.error(`[Node ${port}] Failed to register with broker:`, error.message);
  }
}

// Start the node server
app.listen(port, async () => {
  console.log(`Node listening on port ${port}`);
  await registerWithBroker(); // Register on startup
});

