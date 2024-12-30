require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Blockchain, Transaction } = require("./blockchain");
const EC = require("elliptic").ec; // Import elliptic for signing
const ec = new EC("secp256k1"); // Initialize elliptic

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Generate Node Account Address (NAA)
const nodeKey = ec.genKeyPair();
const nodePrivateKey = nodeKey.getPrivate("hex");
const nodePublicKey = nodeKey.getPublic("hex");

console.log("Node Account Address (NAA):");
console.log(`Private Key: ${nodePrivateKey}`);
console.log(`Public Key (Mining Reward Address): ${nodePublicKey}`);

// Initialize Blockchain
const demoCoin = new Blockchain(nodePublicKey);

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Blockchain API");
});

app.get("/chain", (req, res) => {
  res.json(demoCoin);
});

app.post("/create-coins", (req, res) => {
  const { recipientAddress, amount } = req.body;

  console.log("Creating coins:", req.body);

  try {
    if (!recipientAddress || !amount) {
      throw new Error("Recipient address and amount are required.");
    }

    demoCoin.createCoins(recipientAddress, amount);

    res.status(200).json({ message: "Coins created successfully!" });
  } catch (error) {
    console.error("Error creating coins:", error.message);
    res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.post("/transaction", (req, res) => {
  const {
    fromAddress,
    toAddress,
    amount,
    privateKey,
    type,
    attributes,
    executable,
  } = req.body;

  console.log("Incoming transaction payload:", req.body);

  try {
    if (!toAddress) {
      throw new Error("Recipient address (toAddress) is required.");
    }

    const tx = new Transaction(
      fromAddress,
      toAddress,
      amount,
      type || "transfer", // Default to "transfer" if type not provided
      attributes || {}, // Default to empty attributes
      executable || false // Default to not executable
    );

    // If fromAddress is provided, validate and sign the transaction
    if (fromAddress) {
      if (!privateKey) {
        throw new Error(
          "Private key is required for user-generated transactions."
        );
      }

      const key = ec.keyFromPrivate(privateKey);
      const walletAddress = key.getPublic("hex");

      if (walletAddress !== fromAddress) {
        throw new Error("Invalid private key for the given fromAddress.");
      }

      tx.signTransaction(key);
    } else {
      // For system-generated transactions, no signing is required
      console.log("System-generated transaction: No signature required.");
    }

    demoCoin.addTransaction(tx);

    res.status(200).json({ message: "Transaction added successfully!" });
  } catch (error) {
    console.error("Error in /transaction:", error.message);
    res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.get("/pending-transactions", (req, res) => {
  console.log("Fetching pending transactions...");
  try {
    const pendingTransactions = demoCoin.getPendingTransactions();
    res.json(pendingTransactions);
  } catch (error) {
    console.error("Error fetching pending transactions:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/mine", (req, res) => {
  console.log("Mining transactions for Node Account Address:", nodePublicKey);

  try {
    demoCoin.minePendingTransactions(nodePublicKey); // Use the generated public key as the reward address
    res.status(200).json({ message: "Mining complete!" });
  } catch (error) {
    console.error("Error in /mine:", error.message);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;

  console.log("Fetching balance for address:", address);

  try {
    const balance = demoCoin.getBalanceOfAddress(address);
    res.json({ balance });
  } catch (error) {
    console.error("Error in /balance:", error.message);
    res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Blockchain API is running at http://localhost:${PORT}`);
});
