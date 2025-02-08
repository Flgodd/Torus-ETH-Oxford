import axios from "axios";

const BROKER_URL = "http://localhost:8030";

// Function to send a request through the broker
async function sendRequest(payload) {
  try {
    const response = await axios.post(`${BROKER_URL}/query`, payload);
    console.log("Query response:", response.data);
  } catch (error) {
    console.error("Query error:", error.response?.data || error.message);
  }
}

// Run test
(async () => {
  await sendRequest({ operation: "CREATE", data: { key: "username", value: "john_doe" } });
  await sendRequest({ operation: "READ", data: { key: "username" } });
  await sendRequest({ operation: "UPDATE", data: { key: "username", value: "jane_doe" } });
  await sendRequest({ operation: "DELETE", data: { key: "username" } });
})();