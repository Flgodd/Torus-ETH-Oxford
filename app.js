document.addEventListener("DOMContentLoaded", () => {
    // Attach event listener to the button
    document.getElementById("establishConnectionBtn").addEventListener("click", establishConnection);
});

// ✅ Establish Connection Function
function establishConnection() {
    const privateKey = document.getElementById("walletAddress").value.trim();
    const statusMessage = document.getElementById("statusMessage");

    // ✅ Check if the input is empty
    if (!privateKey) {
        statusMessage.textContent = "❌ Error: Private key cannot be empty.";
        statusMessage.style.color = "red";
        return;
    }

    // ✅ Validate private key format (Ethereum-style: 0x + 40 hex characters)
    const privateKeyRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!privateKeyRegex.test(privateKey)) {
        statusMessage.textContent = "❌ Error: Invalid private key format.";
        statusMessage.style.color = "red";
        return;
    }

    // ✅ If everything is valid, proceed with success message
    statusMessage.textContent = "✅ Success!";
    statusMessage.style.color = "green";
}
