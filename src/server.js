require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Blockchain = require("./blockchain"); // Import Blockchain class
const Transaction = require("./transaction"); // Import Transaction class
const { MAX_FAUCET_AMOUNT } = require("./constants"); // Import constants
const EC = require("elliptic").ec; // Import elliptic for signing
const ec = new EC("secp256k1");

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

// Get the entire chain
app.get("/chain", (req, res) => {
  res.json(demoCoin);
});

// Create coins (Faucet transaction)
app.post("/create-coins", (req, res) => {
  const { recipientAddress, amount } = req.body;

  console.log("Creating coins:", req.body);

  try {
    if (!recipientAddress || !amount) {
      throw new Error("Recipient address and amount are required.");
    }

    if (amount > MAX_FAUCET_AMOUNT) {
      throw new Error(`Faucet amount exceeds the maximum limit of ${MAX_FAUCET_AMOUNT}.`);
    }

    const coinTransaction = new Transaction(
      null, // System-generated transaction
      recipientAddress,
      amount,
      "faucet",
      { note: "Faucet coin creation" },
      true
    );

    demoCoin.addTransaction(coinTransaction);

    res.status(200).json({ message: "Coins created successfully!" });
  } catch (error) {
    console.error("Error creating coins:", error.message);
    res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Add a transaction
app.post("/transaction", (req, res) => {
  const { fromAddress, toAddress, amount, privateKey, type, attributes, executable } = req.body;

  console.log("Incoming transaction payload:", req.body);

  try {
    if (!toAddress) {
      throw new Error("Recipient address (toAddress) is required.");
    }

    const tx = new Transaction(
      fromAddress,
      toAddress,
      amount,
      type || "transfer", // Default to "transfer" if not specified
      attributes || {}, // Default to empty attributes
      executable || false
    );

    // If fromAddress is provided, validate and sign the transaction
    if (fromAddress) {
      if (!privateKey) {
        throw new Error("Private key is required for user-generated transactions.");
      }

      const key = ec.keyFromPrivate(privateKey);
      const walletAddress = key.getPublic("hex");

      if (walletAddress !== fromAddress) {
        throw new Error("Invalid private key for the given fromAddress.");
      }

      tx.sign(key);
    } else {
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

// Get pending transactions
app.get("/pending-transactions", (req, res) => {
  console.log("Fetching pending transactions...");
  try {
    res.json(demoCoin.pendingTransactions);
  } catch (error) {
    console.error("Error fetching pending transactions:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Mine transactions
app.post("/mine", (req, res) => {
  console.log("Mining transactions for Node Account Address:", nodePublicKey);

  try {
    demoCoin.minePendingTransactions(nodePublicKey); // Reward to the node's public key
    res.status(200).json({ message: "Mining complete!" });
  } catch (error) {
    console.error("Error in /mine:", error.message);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Get balance for an address
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

// Get token balance for an address
app.get("/token-balance/:address/:tokenID", (req, res) => {
  const { address, tokenID } = req.params;

  console.log(`Fetching token balance for address: ${address}, tokenID: ${tokenID}`);

  try {
    const balance = demoCoin.getTokenBalance(address, tokenID);
    res.json({ balance });
  } catch (error) {
    console.error("Error in /token-balance:", error.message);
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
