require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Blockchain, Transaction } = require("./blockchain");

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
  const { fromAddress, toAddress, amount, privateKey } = req.body;

  try {
    const key = ec.keyFromPrivate(privateKey);
    const walletAddress = key.getPublic("hex");

    if (walletAddress !== fromAddress) {
      throw new Error("Invalid private key for the given fromAddress");
    }

    const tx = new Transaction(fromAddress, toAddress, amount);
    tx.signTransaction(key);
    demoCoin.addTransaction(tx);

    res.status(200).json({ message: "Transaction added successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/mine", (req, res) => {
  const { miningRewardAddress } = req.body;

  try {
    demoCoin.minePendingTransactions(miningRewardAddress);
    res.status(200).json({ message: "Mining complete!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = demoCoin.getBalanceOfAddress(address);
  res.json({ balance });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Blockchain API is running at http://localhost:${PORT}`);
});
