<img src="static/output-2.jpg" alt="DMO Logo" width="70"/>

# Porous Torus - A Decentralised Memory Organ (DMO)

>Porous Torus™, a **Decentralised Memory Organ (DMO)**  is a robust, high-throughput, decentralized memory retrieval and storage system. A crucial part of the Torus Agent Swarm, DeMemoir serves as a **tamper-proof** data store **without a single point of failure**. DeMemoir's archietecture ensures that data is always accessible, even if some nodes are offline and is designed to concurrently handle a large number of concurrent read and write requests.




---

# Getting Started

## Requirements

- [Docker](https://docs.docker.com/engine/install/) - Ensure Docker is installed and running 
- [Node](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) - Node.js and npm

## Quick Start

To run Decentralised Memory Organ
```
npm install
node index.js
```

If docker is running, you should see the the following print outs of the health checks of the nodes. It may take some time to startup. 

```
Health check [PASSED] for localhost:3001
Health check [PASSED] for localhost:3002
...
```

###### Authorisation Token

Connect your wallet via the *index.html* to get authorisation to make requests. 

###### Running Locally

Make requests to http://localhost:3000/ with your Authorization Header. 


---

# **Technical Specification**

## **1. Introduction**
The **Decentralised Memory Organ (DMO)** is a distributed, fault-tolerant data storage and retrieval system designed to function as a **peer-to-peer knowledge repository**. It leverages **OrbitDB** for decentralised, IPFS-backed storage, **SQLite** for low-latency local caching, and **Torus network authentication** to regulate access and permissions.

This system is designed to be:
- **Tamper-proof** – leveraging blockchain-verified logs and optional **Trusted Execution Environments (TEE)**.
- **Decentralised** – eliminating single points of failure via **OrbitDB and IPFS**.
- **Efficient** – incorporating **SQLite caching** for rapid data access.
- **Secure** – using **cryptographic authentication** based on **wallet proof-of-ownership**.

---

## **2. System Architecture**

<p align="center">

<img src="static/torusdememolight.svg" alt="DMO Logo" width="600"/>

</p>

The DMO consists of **three primary layers**:

1. **Storage Layer** – Handles decentralised storage using **OrbitDB over IPFS**, with **SQLite caching** for low-latency reads.
2. **Processing Layer** – Manages authentication, CRUD operations, and data synchronization across nodes.
3. **Access Layer** – A decentralised API exposing endpoints for agents to interact with the memory organ.

### **2.1 Core Components**
| Component                | Description |
|--------------------------|-------------|
| **Memory Organ Nodes**   | Each node maintains an OrbitDB instance and a local SQLite cache. These nodes are containerized using **Docker** for easy deployment. |
| **OrbitDB (IPFS-based)** | Ensures persistent, decentralised data storage with **peer-to-peer synchronization**. |
| **SQLite Cache**         | Provides fast lookups and stores frequently accessed data locally. |
| **Torus Network Module** | Registers DMO as a **Torus module**, enforcing agent authentication and permissions. |
| **Decentralised Load Balancer** | Dynamically routes queries across multiple nodes based on availability and load. |
| **Cryptographic Authentication** | Ensures data security via **public/private key encryption** and **wallet-based identity verification**. |
| **Trusted Execution Environment (TEE) [Optional]** | Provides additional tamper-proofing by executing sensitive operations in a secure enclave. |

---

## **3. Data Model**
DMO supports **structured data storage** beyond simple key-value pairs. The data schema is designed to accommodate **hierarchical knowledge structures**, with indexing and foreign key support.

### **3.1 Data Schema**
| Field Name             | Type        | Description |
|------------------------|------------|-------------|
| `id`                  | `UUID`      | Unique identifier for each memory entry. |
| `insertion_timestamp` | `DATETIME`  | Timestamp when the entry was added. |
| `agent_id`            | `STRING`    | Wallet address of the agent who created the entry. |
| `raw_text_data`       | `TEXT`      | Unstructured memory content. |
| `metadata`            | `JSON`      | Structured metadata for searchability. |
| `parent_id` (optional) | `UUID`      | References a parent entry for hierarchical relationships. |

### **3.2 Storage Mechanism**
- **Primary Storage:** OrbitDB (IPFS-backed, peer-to-peer storage)
- **Secondary Cache:** SQLite (Optimized for quick queries)

---

## **4. Workflow & Operations**
### **4.1 Agent Authentication**
1. Agent signs a challenge with their **wallet’s private key**.
2. Signature is verified against the agent’s **public wallet address**.
3. If authentication is successful, the agent receives a **session token** for future API interactions.
```
Bearer <token>
```

### **4.2 CRUD Operations**
| Operation     | Description |
|--------------|-------------|
| **Create**   | Stores a new memory entry in **OrbitDB** and caches it in **SQLite**. |
| **Read**     | Queries SQLite first; if not found, retrieves from OrbitDB and caches locally. |
| **Update**   | Authenticated agents can modify records if they have the correct permissions. |
| **Delete**   | Soft-delete approach: Entries are marked as deleted but remain immutable. |

### **4.3 Data Synchronization**
- OrbitDB **propagates updates** across nodes asynchronously.
- SQLite **caches** frequently accessed records for low-latency reads.
- Periodic cache **invalidation policies** ensure data freshness.

---

## **5. Security & Access Control**
Security is a primary concern, ensuring data integrity and agent-based access control.

### **5.1 Cryptographic Authentication**
- Agents must **prove ownership of their wallet address** via **ECDSA signature verification**.
- All communications are **encrypted** using **public/private key encryption**.

### **5.2 Permission System**
| Permission Level | Description |
|------------------|-------------|
| **Read-Only**   | Can retrieve data but not modify it. |
| **Editor**      | Can create and update records. |
| **Admin**       | Can delete or manage permissions. |

### **5.3 Optional: Trusted Execution Environment (TEE)**
- Ensures that even **node operators** cannot manipulate stored data.
- Encrypts memory operations within **a secure enclave**.

---

## **6. Deployment & Infrastructure**
Each **Memory Organ Node** runs inside a **Docker container**, enabling flexible deployment.

### **6.1 Deployment Options**
| Environment    | Description |
|---------------|-------------|
| **Bare-metal servers** | Ideal for high-security environments with TEE support. |
| **Cloud Deployment**   | Nodes deployed on AWS, GCP, or decentralized cloud services (e.g., Akash Network). |
| **P2P Edge Network**   | Fully distributed deployment across self-hosted nodes. |

### **6.2 Load Balancing Strategy**
A **decentralised load balancer** dynamically routes API requests to the optimal node, considering:
- **Node availability** (latency and uptime).
- **Storage load** (OrbitDB replication status).
- **Cache hit rate** (determines whether SQLite should be prioritized).

---

## **7. Future Considerations**
### 🔹 **TEE Integration**
- Prevents **unauthorized node operators** from accessing raw memory data.
- Ensures tamper-proof execution of data processing.

### 🔹 **Smart Contract Integration**
- **On-chain governance** for permission delegation.
- Agents stake **Torus coins** to gain permission levels.

### 🔹 **Optimized Data Sharding**
- Sharding mechanisms to distribute data across **specialized nodes**.
- Ensures **scalability** for larger datasets.

### 🔹 **AI-Driven Memory Retrieval**
- Agents could use **LLMs** to **automatically tag, cluster, and retrieve** memory records.
- Enables **semantic search and reasoning** over stored knowledge.

---

## **8. API Specification**
The system provides a REST API for agent interactions.

### **8.1 Endpoints**
| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/store` | Stores a new memory entry. |
| `GET`  | `/retrieve/:key` | Retrieves an entry from cache or OrbitDB. |
| `DELETE` | `/delete/:key` | Marks an entry as deleted (soft delete). |
| `GET` | `/health` | Checks system status. |

### **8.2 API Authentication**
Requests require:
- **Authorization header** with a signed message.
- Agents must sign a **nonce challenge** before each session.

### API Schemas

#### CREATE:
```json
{
  "operation": "CREATE",
  "data": {
    "key": "<resource_key>",
    "value": {
      "<item_id>": { "<attribute>": "<value>", "<attribute>": "<value>" }
    }
  }
}
```

#### READ:
```json
{
  "operation": "READ",
  "data": {
    "key": "<resource_key>"
  }
}
```

#### UPDATE:
```json
{
  "operation": "UPDATE",
  "data": {
    "key": "<resource_key>",
    "value": "<new_value>"
  }
}
```

#### DELETE:
```json
{
  "operation": "DELETE",
  "data": {
    "key": "<resource_key>"
  }
}
```
