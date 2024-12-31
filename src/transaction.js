const { SHA256, serializeAttributes } = require("./utils");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Transaction {
  /**
   * @param {string|null} fromAddress - The sender's public key (or null for system transactions).
   * @param {string} toAddress - The recipient's public key.
   * @param {number} amount - The amount to transfer.
   * @param {string} type - Transaction type, e.g., "transfer", "generate_token".
   * @param {object} attributes - Additional metadata for the transaction.
   * @param {boolean} executable - Whether the transaction is executable immediately.
   */
  constructor(fromAddress, toAddress, amount, type, attributes = {}, executable = false) {
    this.fromAddress = fromAddress; // Sender's public key (null for system-generated transactions)
    this.toAddress = toAddress; // Recipient's public key
    this.amount = amount; // Amount being transferred
    this.type = type; // Type of transaction, e.g., "transfer", "generate_token"
    this.attributes = attributes; // Metadata for specific transaction types
    this.executable = executable; // Indicates if the transaction is executable
    this.signature = null; // Signature of the transaction
  }

  /**
   * Calculates the hash of the transaction.
   * Combines all relevant properties into a string, including serialized attributes.
   * @returns {string} The SHA256 hash of the transaction.
   */
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

  /**
   * Signs the transaction using the sender's private key.
   * Verifies the sender's public key matches the "fromAddress" field.
   * @param {object} signingKey - The EC key pair used to sign the transaction.
   */
  sign(signingKey) {
    if (this.fromAddress && signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
  }

  /**
   * Validates the transaction.
   * Ensures the signature is present and matches the sender's public key.
   * @returns {boolean} True if the transaction is valid; otherwise, false.
   * @throws {Error} If the signature is missing or invalid.
   */
  isValid() {
    // System-generated transactions are valid by default
    if (this.fromAddress === null) {
      return true;
    }

    // Ensure the transaction has been signed
    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction.");
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

module.exports = Transaction;
