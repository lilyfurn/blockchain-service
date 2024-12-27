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

app.get("/", (req, res) => {
  res.send("Welcome to the Blockchain API");
});

// Initialize Blockchain
const demoCoin = new Blockchain();

// Routes
app.get("/chain", (req, res) => {
  res.json(demoCoin);
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

  console.log("Incoming transaction payload:", req.body); // Debugging log

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

    if (fromAddress && privateKey) {
        const key = ec.keyFromPrivate(privateKey);
        const walletAddress = key.getPublic("hex");
  
        if (walletAddress !== fromAddress) {
          throw new Error("Invalid private key for the given fromAddress.");
        }
  
        tx.signTransaction(key);
      }

    demoCoin.addTransaction(tx);

    res.status(200).json({ message: "Transaction added successfully!" });
  } catch (error) {
    console.error("Error in /transaction:", error.message);
    res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Include stack trace in dev
    });
  }
});

app.post("/mine", (req, res) => {
  const { miningRewardAddress } = req.body;

  console.log("Mining transactions for address:", miningRewardAddress); // Debugging log

  try {
    demoCoin.minePendingTransactions(miningRewardAddress);
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

  console.log("Fetching balance for address:", address); // Debugging log

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
