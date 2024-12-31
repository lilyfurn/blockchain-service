class Token {
    constructor(tokenID, initialSupply, maxSupply, attributes = {}, nodeProgram) {
      this.tokenID = tokenID; // Unique identifier for the token
      this.initialSupply = initialSupply; // Initial supply of the token
      this.maxSupply = maxSupply; // Maximum supply of the token
      this.attributes = attributes; // Validation attributes (e.g., "exist")
      this.nodeProgram = nodeProgram; // Node Program managing the token
      this.validated = false; // Validation status
      this.balances = {}; // Balances of holders
    }
  
    // Validate the token by confirming attributes
    validateToken(attribute, value, validatorAddress) {
      if (this.validated) {
        throw new Error(`Token '${this.tokenID}' is already validated.`);
      }
  
      this.attributes[attribute] = value;
  
      const allAttributesConfirmed = Object.values(this.attributes).every((attr) => attr === true);
  
      if (allAttributesConfirmed) {
        this.validated = true;
  
        // Reward the validator with the entire token supply
        this.balances[validatorAddress] = this.maxSupply;
  
        console.log(`Token '${this.tokenID}' validated and awarded to '${validatorAddress}'.`);
      }
    }
  
    // Get balance of a specific address
    getBalance(address) {
      return this.balances[address] || 0;
    }
  
    // Transfer tokens between addresses
    transfer(fromAddress, toAddress, amount) {
      if (this.balances[fromAddress] < amount) {
        throw new Error("Insufficient balance.");
      }
  
      this.balances[fromAddress] -= amount;
      this.balances[toAddress] = (this.balances[toAddress] || 0) + amount;
  
      console.log(`Transferred ${amount} of '${this.tokenID}' from '${fromAddress}' to '${toAddress}'.`);
    }
  }
  
  module.exports = Token;
  