import express from "express";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || Math.floor(9000 + Math.random() * 1000);
const BROKER_URL = "http://localhost:8030"; // Change if broker is on another machine

app.use(express.json());

// Simulated database (key-value store)
const database = {};

// Health check endpoint
app.get("/health", (req, res) => {
  res.sendStatus(200); // Responds with 200 OK if alive
});

// Handle CRUD requests
app.post("/handleRequest", (req, res) => {
  const { operation, data } = req.body;
  console.log(`[Node ${port}] Received request:`, req.body);

  switch (operation) {
    case "CREATE":
    case "UPDATE":
      database[data._id] = data;
      res.json({ msg: "Success", key: data._id, value: data });
      break;

    case "READ":
      res.json(database[data._id] ? database[data._id] : null);
      break;

    case "DELETE":
      delete database[data._id];
      res.json({ msg: "Deleted", key: data._id });
      break;

    default:
      res.status(400).json({ msg: "Invalid operation" });
  }
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

// Start the node server
app.listen(port, async () => {
  console.log(`Node listening on port ${port}`);
  await registerWithBroker(); // Register on startup
});
