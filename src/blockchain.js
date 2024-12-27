const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const serializeAttributes = (attributes) => {
  return JSON.stringify(
    Object.keys(attributes)
      .sort() // Ensure consistent key order
      .reduce((acc, key) => {
        acc[key] = attributes[key];
        return acc;
      }, {})
  );
};

class Transaction {
  constructor(fromAddress, toAddress, amount, type, attributes = {}, executable = false) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.type = type; // Transaction type, e.g., "transfer" or "account"
    this.attributes = attributes; // Additional attributes for metadata
    this.executable = executable; // Indicates if the transaction is executable
  }
  calculateHash() {
    return SHA256(
      this.fromAddress +
      this.toAddress +
      this.amount +
      this.type +
      serializeAttributes(this.attributes) +
      this.executable
    ).toString();
  }

  signTransaction(signingKey) {
    if (this.fromAddress && signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
    console.log("Transaction signed with signature:", this.signature);
  }


  isValid() {
    console.log("Validating transaction:", this);
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction");
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = "") {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    console.log("Calculating hash for block:", this);
    return SHA256(
      this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
  }

  mineBlock(difficulty) {
    console.log("Starting to mine block with difficulty:", difficulty);
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    console.log("Block mined: " + this.hash);
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      console.log("Validating transaction in block:", tx);
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 0;
    this.pendingTransactions = [];
    this.miningReward = 100;
  }

  createGenesisBlock() {
    console.log("Creating genesis block");
    return new Block(Date.now(), [], "0");
  }
  getLatestBlock() {
    console.log("Fetching latest block");
    return this.chain[this.chain.length - 1];
  }
  minePendingTransactions(miningRewardAddress) {
    console.log("Mining transactions...");
    console.log("Pending transactions before mining:", this.pendingTransactions);
  
    const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
    block.mineBlock(this.difficulty);
  
    console.log("Mined block:", block);
  
    this.chain.push(block);
    this.pendingTransactions = [
      new Transaction(null, miningRewardAddress, this.miningReward),
    ];
  
    console.log("Pending transactions after mining:", this.pendingTransactions);
  }
  addTransaction(transaction) {
    console.log("Adding transaction:", transaction);
  
    if (transaction.fromAddress === null && transaction.toAddress) {
      // Allow system-generated transactions with a null fromAddress
    } else {
      if (!transaction.fromAddress || !transaction.toAddress) {
        throw new Error("Transaction must include from and to address");
      }
  
      const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
      if (senderBalance < transaction.amount) {
        throw new Error("Sender does not have enough balance for this transaction");
      }
    }
  
    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }
  
    this.pendingTransactions.push(transaction);
    console.log("Transaction added to pending transactions:", transaction);
  }
  

  getBalanceOfAddress(address) {
    let balance = 0;
  
    console.log(`Calculating balance for address: ${address}`);
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        console.log("Processing transaction:", trans);
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }
        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }
  
    console.log(`Final balance for ${address}: ${balance}`);
    return balance;
  }
  
  

  isChainValid() {
    console.log("Validating blockchain");
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      console.log("Validating block:", currentBlock);
      if (!currentBlock.hasValidTransactions()) {
        console.error("Block contains invalid transactions:", currentBlock);
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.error("Invalid hash for block:", currentBlock);
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error("Invalid previous hash link for block:", currentBlock);
        return false;
      }
    }

    console.log("Blockchain is valid");
    return true;
  }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
