require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Blockchain = require("./blockchain"); // Layer 1 Blockchain
const NodeProgram = require("./nodeProgram"); // Layer 2 Node Program
const Transaction = require("./transaction"); // Transactions
const { MAX_FAUCET_AMOUNT, SYSTEM_FAUCET_ADDRESS } = require("./constants");
const EC = require("elliptic").ec;
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

// Initialize Layer 1 Blockchain
const demoCoin = new Blockchain(nodePublicKey);

// Node Programs (Layer 2)
const nodePrograms = {};

// Routes

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Blockchain API");
});

// Layer 1: Blockchain Endpoints
app.get("/chain", (req, res) => {
  res.json(demoCoin);
});

app.post("/create-coins", (req, res) => {
  const { recipientAddress, amount } = req.body;

  console.log("Creating coins for:", recipientAddress, "Amount:", amount);

  try {
    if (!recipientAddress || !amount) {
      throw new Error("Recipient address and amount are required.");
    }

    if (amount > MAX_FAUCET_AMOUNT) {
      throw new Error(
        `Faucet amount exceeds the maximum limit of ${MAX_FAUCET_AMOUNT}.`
      );
    }

    const coinTransaction = new Transaction(
      SYSTEM_FAUCET_ADDRESS, // System-generated transaction
      recipientAddress, // Use the provided recipient address
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

  try {
    const tx = new Transaction(
      fromAddress,
      toAddress,
      amount,
      type,
      attributes,
      executable
    );

    // Validate and sign transaction
    if (fromAddress && privateKey) {
      const key = ec.keyFromPrivate(privateKey);
      if (key.getPublic("hex") !== fromAddress) {
        throw new Error("Invalid private key for the given fromAddress.");
      }
      tx.sign(key);
    }

    demoCoin.addTransaction(tx);
    res.status(200).json({ message: "Transaction added successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/mine", (req, res) => {
  try {
    demoCoin.minePendingTransactions(nodePublicKey);
    res.status(200).json({ message: "Mining complete!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/balance/:address", (req, res) => {
  try {
    const { address } = req.params;
    const balance = demoCoin.getBalanceOfAddress(address);
    res.json({ balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/token-balance/:address/:tokenID", (req, res) => {
  try {
    const { address, tokenID } = req.params;
    const balance = demoCoin.getTokenBalance(address, tokenID);
    res.json({ balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Layer 2: Node Program Endpoints
app.post("/create-node-program", (req, res) => {
  const {
    fromAddress,
    attributes = {}, // Default to empty object
  } = req.body;

  try {
    console.log("Received transaction payload:", req.body);

    // Validate required attributes
    const { name, maxTokens, ...additionalAttributes } = attributes;
    if (!name || typeof maxTokens !== "number") {
      throw new Error("Missing required attributes: 'name' or 'maxTokens'.");
    }

    // Prepare attributes
    const programAttributes = {
      name,
      maxTokens,
      creatorAddress: fromAddress,
      ...additionalAttributes,
    };

    // Create the genesis block via the blockchain
    const genesisBlock = demoCoin.createNodeProgram(programAttributes);
    if (!genesisBlock) {
      throw new Error("Failed to create genesis block.");
    }
    console.log("Genesis block created:", genesisBlock);

    // Register Node Program with the genesis block
    nodePrograms[name] = new NodeProgram(
      name,
      fromAddress,
      maxTokens,
      additionalAttributes,
      genesisBlock
    );

    res.status(200).json({
      message: "Node Program created successfully!",
      genesisHash: genesisBlock.hash,
    });
  } catch (error) {
    console.error("Error creating Node Program:", error.message);
    res.status(400).json({ error: error.message });
  }
});


app.get("/node-programs", (req, res) => {
  try {
    res.json(
      Object.values(nodePrograms).map((program) => program.getDetails())
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/node-program/:name", (req, res) => {
  const { name } = req.params;

  try {
    const program = nodePrograms[name];
    if (!program) {
      throw new Error("Node Program not found.");
    }
    res.json(program.getDetails());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/node-program/:genesisHash/ledger", (req, res) => {
    const { genesisHash } = req.params;
  
    try {
      console.log("nodePrograms:", nodePrograms);
    console.log("Requested Genesis Hash:", genesisHash);
      const program = Object.values(nodePrograms).find(
        (program) => program.genesisBlock.hash === genesisHash
      );
      if (!program) {
        throw new Error("Node Program not found.");
      }
      res.json(program);
    } catch (error) {
      console.error("Error in /node-program/:genesisHash/ledger:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

app.get("/node-program/:name/ledger", (req, res) => {
    const { name } = req.params;
  
    try {
      const program = nodePrograms[name];
      if (!program) {
        throw new Error("Node Program not found.");
      }
  
      // Respond with the ledger of the Node Program
      res.json(program.ledger);
    } catch (error) {
      console.error("Error fetching Node Program ledger:", error.message);
      res.status(400).json({ error: error.message });
    }
  });
  

app.post("/node-program/:name/transaction", (req, res) => {
  const { name } = req.params;
  const {
    fromAddress,
    toAddress,
    amount,
    privateKey,
    type,
    attributes,
    executable,
  } = req.body;

  try {
    const program = nodePrograms[name];
    if (!program) {
      throw new Error("Node Program not found.");
    }

    const tx = new Transaction(
      fromAddress,
      toAddress,
      amount,
      type,
      attributes,
      executable
    );

    // Validate and sign transaction
    if (fromAddress && privateKey) {
      const key = ec.keyFromPrivate(privateKey);
      if (key.getPublic("hex") !== fromAddress) {
        throw new Error("Invalid private key for the given fromAddress.");
      }
      tx.sign(key);
    }

    program.addTransaction(tx);
    res
      .status(200)
      .json({ message: "Node Program transaction added successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Blockchain API is running at http://localhost:${PORT}`);
});
