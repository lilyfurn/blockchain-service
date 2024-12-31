// System Addresses
const SYSTEM_ADDRESS = "SYSTEM_1111111111111111111"; // System address for transactions like rewards
const SYSTEM_FAUCET_ADDRESS = "SYSTEM_FAUCET_1111111111"; // System address for faucet operations

// Mining Rewards
const MINING_REWARD = 100; // Reward for mining a block

// Transaction Limits
const MAX_FAUCET_AMOUNT = 100; // Maximum amount that can be requested from the faucet in a single transaction
const FAUCET_COOLDOWN = 24 * 60 * 60 * 1000; // Faucet cooldown period in milliseconds (24 hours)

// Blockchain Configuration
const DIFFICULTY = 2; // Difficulty level for mining
const INITIAL_TOKEN_SUPPLY = 1000000; // Default initial supply for generated tokens

// Validation Rules
const MIN_TX_FEE = 0.01; // Minimum transaction fee in native currency
const TOKEN_MINT_COST = 10; // Cost to mint a new token (in native currency)

// Export constants
module.exports = {
  SYSTEM_ADDRESS,
  SYSTEM_FAUCET_ADDRESS,
  MINING_REWARD,
  MAX_FAUCET_AMOUNT,
  FAUCET_COOLDOWN,
  DIFFICULTY,
  INITIAL_TOKEN_SUPPLY,
  MIN_TX_FEE,
  TOKEN_MINT_COST,
};
