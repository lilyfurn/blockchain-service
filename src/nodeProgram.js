const Block = require("./block");
const Transaction = require("./transaction");
const Token = require("./token");

class NodeProgram {
  constructor(name, creatorAddress, maxTokens, attributes = {}) {
    // Validate required parameters
    if (!name) {
      throw new Error(
        "Invalid or missing 'name'. It must be a non-empty string."
      );
    }

    // if (typeof maxTokens !== "number") {
    //   throw new Error("Invalid 'maxTokens'. It must be a positive number.");
    // }

    this.name = name; // Unique Node Program name
    this.creator = creatorAddress; // Address of the creator
    this.maxTokens = maxTokens; // Maximum number of tokens for this program
    this.attributes = attributes; // Custom attributes for the Node Program
    this.genesisBlock = this.createGenesisBlock(); // Genesis block for the Node Program
    this.ledger = [this.genesisBlock]; // Independent ledger
    this.pendingTransactions = []; // Pending transactions
    this.tokens = {}; // Tokens managed by this Node Program
    this.tokenBalances = {}; // Maps token ID to address balances

    console.log(`NodeProgram initialized:`, this);
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

    // Validate token transactions
    if (transaction.type === "transfer_token") {
      const { tokenID } = transaction.attributes;
      const senderBalance = this.getTokenBalance(
        transaction.fromAddress,
        tokenID
      );

      if (senderBalance < transaction.amount) {
        throw new Error("Insufficient token balance for this transfer.");
      }
    }

    this.pendingTransactions.push(transaction);
  }

  // Mint a new token
  mintToken(tokenID, initialSupply, attributes = {}) {
    if (this.tokens[tokenID]) {
      throw new Error(
        `Token '${tokenID}' already exists in Node Program '${this.name}'.`
      );
    }

    if (Object.keys(this.tokens).length >= this.maxTokens) {
      throw new Error(
        `Node Program '${this.name}' has reached its maximum token limit.`
      );
    }

    const token = new Token(
      tokenID,
      initialSupply,
      this.maxTokens,
      attributes,
      this.name
    );
    this.tokens[tokenID] = token;

    // Update the token balance for the creator
    this.updateTokenBalance(tokenID, this.creator, initialSupply);

    console.log(`Token '${tokenID}' minted in Node Program '${this.name}'.`);
  }

  // Mine pending transactions
  minePendingTransactions() {
    if (this.pendingTransactions.length === 0) {
      throw new Error("No transactions to mine.");
    }

    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.ledger[this.ledger.length - 1].hash
    );
    block.mine(2); // Mining difficulty is set to 2 for Node Programs
    this.ledger.push(block);

    console.log(`Block mined for Node Program '${this.name}'.`);
    this.clearPendingTransactions();
  }

  // Get token balance for an address
  getTokenBalance(address, tokenID) {
    if (!this.tokenBalances[tokenID]) {
      return 0;
    }
    return this.tokenBalances[tokenID][address] || 0;
  }

  // Update token balances after a transaction
  updateTokenBalance(tokenID, address, amount) {
    if (!this.tokenBalances[tokenID]) {
      this.tokenBalances[tokenID] = {};
    }
    this.tokenBalances[tokenID][address] =
      (this.tokenBalances[tokenID][address] || 0) + amount;
  }

  // Get pending transactions
  getPendingTransactions() {
    return this.pendingTransactions;
  }

  // Clear pending transactions
  clearPendingTransactions() {
    this.pendingTransactions = [];
  }

  // Get Node Program details
  getDetails() {
    return {
      name: this.name,
      creator: this.creator,
      maxTokens: this.maxTokens,
      attributes: this.attributes,
      genesisHash: this.genesisBlock.hash,
      totalTokens: Object.keys(this.tokens).length,
    };
  }
}

module.exports = NodeProgram;
