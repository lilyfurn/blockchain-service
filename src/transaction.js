const { SHA256, serializeAttributes } = require("./utils");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Transaction {
  /**
   * @param {string|null} fromAddress - The sender's public key (or null for system transactions).
   * @param {string} toAddress - The recipient's public key.
   * @param {number} amount - The amount to transfer.
   * @param {string} type - Transaction type, e.g., "transfer", "generate_token", "node_program".
   * @param {object} attributes - Additional metadata for the transaction.
   * @param {boolean} executable - Whether the transaction is executable immediately.
   */
  constructor(
    fromAddress,
    toAddress,
    amount,
    type,
    attributes = {},
    executable = false
  ) {
    this.fromAddress = fromAddress; // Sender's public key (null for system-generated transactions)
    this.toAddress = toAddress; // Recipient's public key
    this.amount = amount; // Amount being transferred
    this.type = type; // Type of transaction, e.g., "transfer", "generate_token", "node_program"
    this.attributes = attributes; // Metadata for specific transaction types
    this.executable = executable; // Indicates if the transaction is executable
    this.timestamp = Date.now(); // Timestamp for transaction
    this.signature = null; // Signature of the transaction
  }

  /**
   * Calculates the hash of the transaction.
   * Combines all relevant properties into a string, including serialized attributes.
   * @returns {string} The SHA256 hash of the transaction.
   */

  //   calculateHash() {
  //     return SHA256(
  //       this.timestamp +
  //       this.fromAddress +
  //       this.toAddress +
  //       this.amount +
  //       this.type +
  //       serializeAttributes(this.attributes) +
  //       this.executable
  //     ).toString();
  //   }

  calculateHash() {
    const serializedAttributes = JSON.stringify(this.attributes || {});
    console.log("Serialized Attributes for Backend Hash:", serializedAttributes);
  
    const hash = SHA256(
      `${this.timestamp}${this.fromAddress || ""}${this.toAddress || ""}${
        this.amount || 0
      }${this.type || ""}${serializedAttributes}${this.executable || false}`
    ).toString();
  
    console.log("Calculated Hash in Backend:", hash);
    return hash;
  }

  /**
   * Signs the transaction using the sender's private key.
   * Verifies the sender's public key matches the "fromAddress" field.
   * @param {object} signingKey - The EC key pair used to sign the transaction.
   */
  sign(signingKey) {
    if (!this.fromAddress) {
      throw new Error("System transactions do not require a signature.");
    }

    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
  }

  /**
   * Validates the transaction.
   * Ensures the signature is present and matches the sender's public key.
   * Additional validation for transaction types is included.
   * @returns {boolean} True if the transaction is valid; otherwise, false.
   * @throws {Error} If the signature is missing or invalid.
   */
  isValid() {
    if (this.fromAddress === null) {
      return true;
    }
  
    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction.");
    }
  
    try {
      console.log("Starting signature verification...");
      console.log("From Address (Public Key):", this.fromAddress);
      console.log("Transaction Data for Hash Calculation:", {
        timestamp: this.timestamp,
        fromAddress: this.fromAddress,
        toAddress: this.toAddress,
        amount: this.amount,
        type: this.type,
        attributes: this.attributes,
        executable: this.executable,
      });
  
      const hash = this.calculateHash();
      console.log("Calculated Hash:", hash);
  
      console.log("Provided Signature:", this.signature);
  
      const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
      const isVerified = publicKey.verify(hash, this.signature);
  
      console.log("Signature Verification Result:", isVerified);
  
      return isVerified;
    } catch (error) {
      console.error("Error during signature verification:", error.message);
      throw new Error("Transaction signature verification failed.");
    }
  }
  



  /**
   * Validates the transaction type-specific rules.
   * Ensures that the attributes align with the expected schema for the type.
   * @returns {boolean} True if the transaction type is valid; otherwise, throws an error.
   */
  validateTypeSpecificRules() {
    switch (this.type) {
      case "generate_token":
        if (!this.attributes.tokenID || this.amount !== 0) {
          throw new Error("Invalid generate_token transaction attributes.");
        }
        break;
      case "node_program":
        if (!this.attributes.name || !this.attributes.maxTokens) {
          throw new Error("Invalid node_program creation attributes.");
        }
        break;
      case "transfer_token":
        if (!this.attributes.tokenID) {
          throw new Error(
            "TokenID is required for transfer_token transactions."
          );
        }
        break;
      case "validate_token":
        if (!this.attributes.tokenID || !this.attributes.validationAttribute) {
          throw new Error(
            "Token validation requires tokenID and validationAttribute."
          );
        }
        break;
      default:
        throw new Error(`Unknown transaction type: ${this.type}`);
    }
    return true;
  }
}

module.exports = Transaction;
