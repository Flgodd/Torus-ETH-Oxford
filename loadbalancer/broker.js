import express from "express";
import axios from "axios";
import { LRUCache } from "./LRUcache.js";

const app = express();
const port = 8030;

app.use(express.json()); // Middleware to parse JSON requests

const cache = new LRUCache(100);

// Broker object to store subscriber addresses
const nodeStore = {
    nodes: [],
    index: 0,
    failures: {},
};

const broker = {
  store: [],
  QState: false,
};


function rannn(){
    console.log("hello")
}

function getNextNode() {
    if (nodeStore.nodes.length === 0) {
      return null;
    }
    const node = nodeStore.nodes[nodeStore.index];
    nodeStore.index = (nodeStore.index + 1) % nodeStore.nodes.length;
    return node;
  }

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
  try {
    const { serverAddress } = req.body;
    if (!serverAddress) {
      return res.status(400).json({ msg: "Missing serverAddress in request" });
    }
    
    nodeStore.nodes.push(serverAddress);
    broker.QState = true;
    res.json({ msg: "Subscription successful" });
    rannn()
  } catch (error) {
    res.status(500).json({ msg: "Error during subscription" });
  }
});


app.post("/query", async (req, res) => {
    const { operation, data } = req.body;

    if(operation === "READ" && data._id){
        const cachedResponse = cache.get(data._id);
        if (cachedResponse) {
          console.log(`Cache hit for key: ${data._id}`);
          return res.json({ fromCache: true, data: cachedResponse });
        }
    }
    const node = getNextNode();
    console.log("Node:", node);
    if (!node) {
        return res.status(503).json({ msg: "No nodes available" });
    }

    try {
        const response = await axios.post(`http://${node}/handleRequest`, req.body);
        if(operation === "READ" && data._id){
            cache.set(data._id, response.data);
        }
        if(operation === "DELETE" && data._id){
            cache.cache.delete(data._id); // Remove from cache
            console.log(`Cache entry removed for key: ${data._id}`);
        }
        if((operation === "CREATE" || operation === "UPDATE") && data._id){
            cache.set(data._id, data); // Store value in cache
            console.log(`Cache updated for key: ${data._id}`);
        }
        res.json(response.data);
    } catch (error) {
        console.error(`Error forwarding request to ${node}:`, error.message);
        res.status(500).json({ msg: `Failed to forward request to node ${node}` });
    }
});

async function checkNodeHealth() {
    for (const node of [...nodeStore.nodes]) {
        try {
        await axios.get(`http://${node}/health`, { timeout: 2000 });
        nodeStore.failures[node] = 0; // Reset failure count on success
        console.warn(`Health check [PASSED] for ${node}`);
        } catch (error) {
        console.warn(`Health check failed for ${node}`);
        nodeStore.failures[node] = (nodeStore.failures[node] || 0) + 1;

        if (nodeStore.failures[node] >= 3) {
            console.warn(`Node ${node} removed due to repeated failures`);
            nodeStore.nodes = nodeStore.nodes.filter(n => n !== node);
            delete nodeStore.failures[node];
        }
        }
    }
}

setInterval(checkNodeHealth, 10000);

app.get("/qstatus", (req, res) => {
  res.json({ status: broker.QState });
});

app.listen(port, () => {
  console.log(`Broker listening on port ${port}`);
});
