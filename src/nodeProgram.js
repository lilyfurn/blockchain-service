const Block = require("./block");
const Transaction = require("./transaction");
const Token = require("./token");

class NodeProgram {
  constructor(name, creatorAddress, attributes = {}) {
    this.name = name; // Unique Node Program name
    this.creator = creatorAddress; // Address of the creator
    this.attributes = attributes; // Custom attributes for the Node Program
    this.genesisBlock = this.createGenesisBlock(); // Genesis block for the Node Program
    this.ledger = [this.genesisBlock]; // Independent ledger
    this.pendingTransactions = []; // Pending transactions
    this.tokens = {}; // Tokens managed by this Node Program
  }

  // Create the genesis block
  createGenesisBlock() {
    return new Block(Date.now(), [], "0");
  }

  // Add a transaction to the Node Program
  addTransaction(transaction) {
    if (!transaction.isValid()) {
      throw new Error("Invalid transaction.");
    }

    this.pendingTransactions.push(transaction);
  }

  // Mint a new token
  mintToken(tokenID, initialSupply, maxSupply, attributes = {}) {
    if (this.tokens[tokenID]) {
      throw new Error(`Token '${tokenID}' already exists in Node Program '${this.name}'.`);
    }

    const token = new Token(tokenID, initialSupply, maxSupply, attributes, this.name);
    this.tokens[tokenID] = token;

    console.log(`Token '${tokenID}' minted in Node Program '${this.name}'.`);
  }

  // Get pending transactions
  getPendingTransactions() {
    return this.pendingTransactions;
  }

  // Clear pending transactions
  clearPendingTransactions() {
    this.pendingTransactions = [];
  }
}

module.exports = NodeProgram;
