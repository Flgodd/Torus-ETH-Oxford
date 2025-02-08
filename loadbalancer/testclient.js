import axios from "axios";

const BROKER_URL = "http://localhost:8030"; // Change this if your broker runs on a different machine/port

async function subscribe(serverAddress) {
  try {
    const response = await axios.post(`${BROKER_URL}/subscribe`, { serverAddress });
    console.log("Subscribe Response:", response.data);
  } catch (error) {
    console.error("Error during subscription:", error.response ? error.response.data : error.message);
  }
}

async function checkQStatus() {
  try {
    const response = await axios.get(`${BROKER_URL}/qstatus`);
    console.log("QStatus:", response.data);
  } catch (error) {
    console.error("Error checking QStatus:", error.response ? error.response.data : error.message);
  }
}

// Run test cases
(async () => {
  console.log("Testing subscription...");
  await subscribe("127.0.0.1:8030");

  console.log("\nTesting QStatus...");
  await checkQStatus();
})();
