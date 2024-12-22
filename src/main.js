const { Blockchain, Transaction } = require("./blockchain");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const myKey = ec.keyFromPrivate(
  "460a6670743912b32ed1931efede4e27b4cad3ae3742a73f4ae98a1a6ffff922"
);
const myWalletAddress = myKey.getPublic("hex");

let demoCoin = new Blockchain();

const tx1 = new Transaction(myWalletAddress, "public key goes here", 10);
tx1.signTransaction(myKey);
demoCoin.addTransaction(tx1);

console.log("\n Starting the miner...");
demoCoin.minePendingTransactions(myWalletAddress);

console.log(
  "\n Balance of my wallet is ",
  demoCoin.getBalanceOfAddress(myWalletAddress)
);

demoCoin.chain[1].transactions[0].amount = 1;

console.log("Is chain valid?", demoCoin.isChainValid());
