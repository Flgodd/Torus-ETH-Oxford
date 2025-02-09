import express from "express";
import axios from "axios";
import { LRUCache } from "./LRUcache.js";

const app = express();
const port = process.env.PORT || 8030;

app.use(express.json());

const cache = new LRUCache(100);

const nodeStore = {
    nodes: [],
    index: 0,
    failures: {},
};

const broker = { 
    store: [],
    QState: false,
};

const requestQueue = [];
const MAX_QUEUE_SIZE = 500;  // Maximum queue size to avoid memory overload
const PROCESSING_INTERVAL = 100; // Interval to process queued requests (ms)

function getNextNode() {
    if (nodeStore.nodes.length === 0) return null;
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
    } catch (error) {
        res.status(500).json({ msg: "Error during subscription" });
    }
});

app.post("/query", async (req, res) => {
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
        return res.status(503).json({ msg: "Server busy, try again later" });
    }
    console.log("Request queued");
    const request = { req, res };
    requestQueue.push(request);
});

async function processQueue(){
    if(requestQueue.length === 0) return;

    const { req, res } = requestQueue.shift();
    const { operation, data } = req.body;

    if(operation === "READ" && data._id){
        const cachedResponse = cache.get(data._id);
        if(cachedResponse){
            console.log(`Cache hit for key: ${data._id}`);
            return res.json({ fromCache: true, data: cachedResponse });
        }
    }

    const node = getNextNode();
    if(!node){
        return res.status(503).json({ msg: "No nodes available" });
    }

    try{
        var response = null;
        
        if (operation === "READ" && data._id) {
            response = await axios.post(`http://${node}/read`, req.body)
            cache.set(data._id, response.data);
        }
        else if (operation === "DELETE" && data._id) {
            cache.cache.delete(data._id);
            response = await axios.post(`http://${node}/delete`, req.body)
            console.log(`Cache entry removed for key: ${data._id}`);
        }
        else if(operation === "CREATE"){
            response = await axios.post(`http://${node}/create`, req.body)
        }
        else if (operation === "UPDATE" && data._id) {
            cache.set(data._id, data);
            console.log(`Cache updated for key: ${data._id}`);
            response = await axios.post(`http://${node}/update`, req.body)
        }

        res.json(response.data);
    }catch(error){
        console.error(`Error forwarding request to ${node}:`, error.message);
        res.status(500).json({ msg: `Failed to forward request to node ${node}` });
    }
}


setInterval(processQueue, PROCESSING_INTERVAL);

async function checkNodeHealth() {
    for (const node of [...nodeStore.nodes]) {
        try {
            await axios.get(`http://${node}/health`, { timeout: 2000 });
            nodeStore.failures[node] = 0;
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
