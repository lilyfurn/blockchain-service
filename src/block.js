const { SHA256 } = require("./utils");

class Block {
  constructor(timestamp, transactions, previousHash = "") {
    this.timestamp = timestamp; // Timestamp of the block creation
    this.transactions = transactions; // Transactions included in the block
    this.previousHash = previousHash; // Hash of the previous block
    this.nonce = 0; // Nonce for mining
    this.hash = this.calculateHash(); // Hash of the current block
  }

  /**
   * Calculate the hash of the block
   * Includes the previousHash, timestamp, transactions, and nonce.
   */
  calculateHash() {
    return SHA256(
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce
    ).toString();
  }

  /**
   * Mine the block by finding a hash that matches the difficulty criteria.
   * The difficulty determines the number of leading zeros in the hash.
   */
  mine(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }

  /**
   * Check if all transactions in the block are valid.
   * This calls the `isValid` method on each transaction.
   */
  hasValidTransactions() {
    return this.transactions.every((tx) => {
      try {
        return tx.isValid();
      } catch (error) {
        console.error(`Invalid transaction detected: ${error.message}`);
        return false;
      }
    });
  }
}

module.exports = Block;

