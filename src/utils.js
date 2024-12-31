const SHA256 = require("crypto-js/sha256");

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

module.exports = {
  SHA256,
  serializeAttributes,
};
