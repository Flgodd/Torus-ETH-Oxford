import express from "express";
import axios from "axios";
import { LRUCache } from "./LRUcache.js";
import { fork } from "child_process";

const app = express();
const port = 8030;

app.use(express.json());

import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, "1d7f0787628387697bb054a6b966b04b210b50af3e2ffc57045e83e9e7ef6237", (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token." });
        }

        req.user = user; // Attach decoded payload to req
        next();
    });
};

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

app.post("/query", authenticateToken, async (req, res) => {
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
        return res.status(503).json({ msg: "Server busy, try again later" });
    }
    console.log("Request queued");
    const request = { req, res };
    requestQueue.push(request);
});

app.get("/nodelistLength", async (req, res) => {
    return res.json({length: nodeStore.nodes.length});
});

async function processQueue(){
    if(requestQueue.length === 0) return;

    const { req, res } = requestQueue.shift();
    const { operation, data } = req.body;

    if (operation === "READ" && data.key){
        const cachedResponse = cache.get(data.key);
        if(cachedResponse){
            console.log(`Cache hit for key: ${data.key}`);
            return res.json({ fromCache: true, data: cachedResponse });
        }
    }

    const node = getNextNode();
    if(!node){
        return res.status(503).json({ message: "No nodes available" });
    }

    try{
        var response = null;
        console.log(`Forwarding request to node: ${node}`);
        if (operation === "CREATE" && data.key && data.value){
            response = await axios.post(`http://${node}/create`, data);
        }
        else if (operation === "READ") {
            response = await axios.get(`http://${node}/read`, { params: { key: data.key }});
            cache.set(data.key, response.data);
        }
        else if (operation === "UPDATE") {
            response = await axios.post(`http://${node}/update`, data);
            cache.set(data.key, data);
            console.log(`Cache updated for key: ${data.key}`);
        }
        else if (operation === "DELETE") {
            response = await axios.post(`http://${node}/delete`, data.key);
            cache.cache.delete(data.key);
            console.log(`Cache entry removed for key: ${data.key}`);
        }
        else {
            console.error(`Unrecognised operation:`, operation);
            response = 'ERROR'
        }
        res.json(response.data);
    } catch (error) {
        console.error(`Error forwarding request to ${node}:`, error.message, response?.data);
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

app.listen(port, '0.0.0.0', () => {
    console.log(`Broker listening on port ${port}. Starting Organelles.`);
    fork("./orchestrator.js", [process.argv[2]]);
});
