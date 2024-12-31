const Block = require("./block");
const Transaction = require("./transaction");
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
    this.tokens = {}; // Holds metadata for tokens
    this.tokenBalances = {}; // Maps token ID to address balances
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

    // Reward miner with mining reward
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
    // Handle token transfer validation
    if (transaction.type === "transfer_token") {
      const senderBalance = this.getTokenBalance(transaction.fromAddress, transaction.attributes.tokenID);
  
      if (senderBalance < transaction.amount) {
        throw new Error("Insufficient token balance for this transfer.");
      }
    }
  
    // Handle token fork validation
    if (transaction.type === "fork_token") {
      const senderBalance = this.getTokenBalance(transaction.fromAddress, transaction.attributes.originalTokenID);
  
      // Ensure sender has sufficient balance of the original token
      if (senderBalance <= 0) {
        throw new Error("Insufficient balance of the original token to fork.");
      }
  
      // Ensure the new token ID does not already exist
      for (const block of this.chain) {
        for (const trans of block.transactions) {
          if (
            trans.type === "generate_token" &&
            trans.attributes.tokenID === transaction.attributes.newTokenID
          ) {
            throw new Error("The new token ID already exists.");
          }
        }
      }
    }
  
    // General transaction validation
    if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }
  
    // Add transaction to pending transactions
    this.pendingTransactions.push(transaction);
  }
  
  

  // Validation for different types of transactions
  validateTransaction(transaction) {
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
      default:
        throw new Error(`Unknown transaction type: ${transaction.type}`);
    }
  }

  validateTransfer(transaction) {
    const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
    if (senderBalance < transaction.amount) {
      throw new Error("Insufficient balance for transfer.");
    }
    if (!transaction.signature) {
      throw new Error("Transaction must be signed.");
    }
  }

  validateFaucet(transaction) {
    if (transaction.amount > 100) {
      // Assuming 100 is the max faucet amount
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

  // Update token balances after a transaction
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
        // Check for transactions involving the specific tokenID
        if (
          trans.type === "transfer_token" &&
          trans.attributes.tokenID === tokenID
        ) {
          if (trans.fromAddress === address) {
            balance -= trans.amount;
          }
          if (trans.toAddress === address) {
            balance += trans.amount;
          }
        }

        // Add initial supply if the token was generated
        if (trans.type === "generate_token" && trans.toAddress === address) {
          if (trans.attributes.tokenID === tokenID) {
            balance += trans.attributes.initialSupply;
          }
        }
      }
    }

    return balance;
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
