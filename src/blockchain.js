const Block = require("./block");
const Transaction = require("./transaction");
const NodeProgram = require("./nodeProgram");
const {
  SYSTEM_ADDRESS,
  SYSTEM_FAUCET_ADDRESS,
  MINING_REWARD,
} = require("./constants");

class Blockchain {
  constructor(miningRewardAddress) {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.difficulty = 2; // Mining difficulty
    this.miningReward = MINING_REWARD;
    this.miningRewardAddress = miningRewardAddress;
    this.tokens = {}; // Metadata for tokens
    this.tokenBalances = {}; // Maps token ID to address balances
    this.nodePrograms = {}; // Node Programs on this blockchain
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mine(this.difficulty);
    this.chain.push(block);

    // Reward miner
    this.pendingTransactions = [
      new Transaction(
        SYSTEM_ADDRESS,
        miningRewardAddress,
        this.miningReward,
        "reward"
      ),
    ];
  }

  addTransaction(transaction) {
    this.validateTransaction(transaction);

    // Process special transactions (e.g., node program creation)
    if (transaction.type === "node_program") {
      this.createNodeProgram(transaction);
    }

    this.pendingTransactions.push(transaction);
  }

  validateTransaction(transaction) {
    if (transaction.type === "faucet") {
      // Skip signature validation for faucet transactions
      return;
    }
    switch (transaction.type) {
      case "transfer":
        this.validateTransfer(transaction);
        break;
      case "faucet":
        this.validateFaucet(transaction);
        break;
      case "generate_token":
        this.validateGenerateToken(transaction);
        break;
      case "transfer_token":
        this.validateTransferToken(transaction);
        break;
      case "node_program":
        this.validateNodeProgram(transaction);
        break;
      default:
        throw new Error(`Unknown transaction type: ${transaction.type}`);
    }

    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }
  }

  validateTransfer(transaction) {
    const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
    if (senderBalance < transaction.amount) {
      throw new Error("Insufficient balance for transfer.");
    }
  }

  validateFaucet(transaction) {
    if (transaction.amount > 100) {
      throw new Error("Requested faucet amount exceeds limit.");
    }
  }

  validateGenerateToken(transaction) {
    const { tokenID } = transaction.attributes;
    if (this.tokens[tokenID]) {
      throw new Error("Token ID already exists.");
    }
  }

  validateTransferToken(transaction) {
    const { tokenID } = transaction.attributes;
    const senderBalance = this.getTokenBalance(
      transaction.fromAddress,
      tokenID
    );
    if (senderBalance < transaction.amount) {
      throw new Error("Insufficient token balance for transfer.");
    }
  }

  validateNodeProgram(transaction) {
    const { name } = transaction.attributes;
    if (this.nodePrograms[name]) {
      throw new Error(`Node Program '${name}' already exists.`);
    }
  }

  processTokenTransaction(transaction) {
    const { type } = transaction;
    if (type === "generate_token") {
      this.tokens[transaction.attributes.tokenID] = {
        supply: transaction.attributes.initialSupply,
        author: transaction.fromAddress,
      };
      this.updateTokenBalances(transaction);
    } else if (type === "transfer_token") {
      this.updateTokenBalances(transaction);
    }
  }

  updateTokenBalances(transaction) {
    const { tokenID } = transaction.attributes;
    const { fromAddress, toAddress, amount } = transaction;

    if (!this.tokenBalances[tokenID]) {
      this.tokenBalances[tokenID] = {};
    }
    if (fromAddress) {
      this.tokenBalances[tokenID][fromAddress] =
        (this.tokenBalances[tokenID][fromAddress] || 0) - amount;
    }
    if (toAddress) {
      this.tokenBalances[tokenID][toAddress] =
        (this.tokenBalances[tokenID][toAddress] || 0) + amount;
    }
  }

  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }
    return balance;
  }

  getTokenBalance(address, tokenID) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (
          trans.type === "transfer_token" &&
          trans.attributes.tokenID === tokenID
        ) {
          if (trans.fromAddress === address) balance -= trans.amount;
          if (trans.toAddress === address) balance += trans.amount;
        }

        if (trans.type === "generate_token" && trans.toAddress === address) {
          if (trans.attributes.tokenID === tokenID) {
            balance += trans.attributes.initialSupply;
          }
        }
      }
    }

    return balance;
  }

  createNodeProgram(transaction) {
    console.log("Node Program Running...");
    console.log("Transaction Object Received:", transaction);

    // Ensure the transaction contains valid data
    if (
      typeof transaction !== "object" ||
      Array.isArray(transaction) ||
      !transaction
    ) {
      throw new Error("Invalid transaction format received.");
    }

    // Validate required attributes
    const { name, maxTokens, creatorAddress, ...additionalAttributes } =
      transaction;

    if (!name || typeof name !== "string") {
      throw new Error("Missing required attribute: 'name'.");
    }

    if (typeof maxTokens !== "number" || maxTokens <= 0) {
      throw new Error(
        "Missing or invalid 'maxTokens'. It must be a positive number."
      );
    }

    if (this.nodePrograms[name]) {
      throw new Error(`Node Program '${name}' already exists.`);
    }

    // Create the genesis block
    const genesisBlock = new Block(Date.now(), [], "0");
    this.chain.push(genesisBlock); // Add to blockchain ledger
    console.log(`Genesis block for '${name}':`, genesisBlock);

    // Register the Node Program using the genesis block
    this.nodePrograms[name] = {
      name,
      maxTokens,
      creatorAddress,
      attributes: additionalAttributes,
      genesisBlock, // Store the genesis block reference
      ledger: [genesisBlock], // Initialize ledger
      pendingTransactions: [],
    };

    return genesisBlock; // Return the created block
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

module.exports = Blockchain;
