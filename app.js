
const API_URL = "http://localhost:3000"; // Change if your backend is on another host


async function validateAddress() {
    const walletAddress = document.getElementById("walletAddress").value.trim();
    const statusMessage = document.getElementById("statusMessage");

    if (!walletAddress) {
        statusMessage.textContent = "❌ Please enter a wallet address.";
        statusMessage.style.color = "red";
        return;
    }

    try {
        // Send Address to Backend for Validation
        const response = await fetch(`${API_URL}/validate-wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress })
        });

        const result = await response.json();

        if (result.valid) {
            statusMessage.textContent = `✅ Address is valid. Now sign the message.`;
            statusMessage.style.color = "green";

            
            document.getElementById("signButton").style.display = "block";
        } else {
            statusMessage.textContent = "❌ Invalid wallet address!";
            statusMessage.style.color = "red";
        }
    } catch (error) {
        console.error("Validation error:", error);
        statusMessage.textContent = "❌ Error validating address.";
        statusMessage.style.color = "red";
    }
}


async function signMessage() {
    const walletAddress = document.getElementById("walletAddress").value.trim();
    const statusMessage = document.getElementById("statusMessage");

    if (!walletAddress) {
        statusMessage.textContent = "❌ Wallet address is required!";
        statusMessage.style.color = "red";
        return;
    }

    try {

        // Ensure Polkadot.js Extension is Installed
        if (!window.injectedWeb3 || !window.injectedWeb3["polkadot-js"]) {
            console.error("🚨 Polkadot.js extension not detected!");
            statusMessage.textContent = "❌ Polkadot.js extension not found. Please install and enable it.";
            statusMessage.style.color = "red";
            return;
        }

        // Enable the Extension via `window.injectedWeb3`
        const polkadotExtension = await window.injectedWeb3["polkadot-js"].enable();
        console.log("✅ Polkadot.js extension enabled:", polkadotExtension);

        // Get Accounts Using `window.injectedWeb3`
        const accounts = await polkadotExtension.accounts.get();
        console.log("✅ Retrieved accounts:", accounts);

        if (!accounts || accounts.length === 0) {
            statusMessage.textContent = "❌ No accounts found!";
            statusMessage.style.color = "red";
            return;
        }

        // Find the User's Account
        const account = accounts.find(acc => acc.address === walletAddress);
        if (!account) {
            statusMessage.textContent = "❌ Wallet not found in Polkadot.js extension!";
            statusMessage.style.color = "red";
            return;
        }

        //  Request Challenge from Backend
        const challengeResponse = await fetch(`${API_URL}/authenticate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress })
        });

        const { challenge } = await challengeResponse.json();
        console.log("✅ Challenge received:", challenge);

        const injector = await window.injectedWeb3["polkadot-js"].enable();
        const signer = injector.signer;
        if (!signer) {
            throw new Error("Signer not available!");
        }

        // Sign the Message (Challenge)
        const { signature } = await signer.signRaw({
            address: walletAddress,
            data: challenge,
            type: "bytes" 
        });

        console.log("✅ Signed Message:", signature);

        // ✅ Send Signed Message to Backend
        const verifyResponse = await fetch(`${API_URL}/verify-signature`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress,
                signedMessage: signature,
                challenge: challenge
            })
        });

        const verifyResult = await verifyResponse.json();
        console.log("✅ Verify Result:", verifyResult);

        if (verifyResult.success) {
            localStorage.setItem("authToken", verifyResult.token);
            statusMessage.textContent = "✅ Authentication successful!";
            statusMessage.style.color = "green";
        } else {
            statusMessage.textContent = "❌ Authentication failed!";
            statusMessage.style.color = "red";
        }

    } catch (error) {
        console.error("🚨 Signing error:", error);
        statusMessage.textContent = "❌ Error signing message.";
        statusMessage.style.color = "red";
    }
}

