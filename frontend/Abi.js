// ---------------------------------------------------------------------
// Fill this in after you deploy.
// Local Hardhat node:  npx hardhat node   then   npm run deploy:local
// Sepolia (for the actual submission):           npm run deploy:sepolia
// ---------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xEE09042D95615dA9E867e1c481b6393Bfb514aE0";

// --- Network config: swap between these two blocks as needed. ---

// Option A: local Hardhat node (npx hardhat node)
//const EXPECTED_CHAIN_ID_HEX = "0x7a69"; // 31337
//const EXPECTED_CHAIN_NAME = "Hardhat Local";
//const EXPLORER_BASE_URL = ""; // no block explorer for a local chain

// Option B: Ganache (uncomment these three lines and comment out the
// three above if you deploy with `npm run deploy:local -- --network ganache`
// or a Truffle/Ganache workflow instead)
// const EXPECTED_CHAIN_ID_HEX = "0x539"; // 1337
// const EXPECTED_CHAIN_NAME = "Ganache";
// const EXPLORER_BASE_URL = "";

// Option C: Sepolia (use this for your actual assignment submission)
const EXPECTED_CHAIN_ID_HEX = "0xaa36a7"; // 11155111
const EXPECTED_CHAIN_NAME = "Sepolia";
const EXPLORER_BASE_URL = "https://sepolia.etherscan.io";

const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "facilityId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" }
    ], "name": "FacilityRegistered", "type": "event" },

  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "address", "name": "verifier", "type": "address" }
    ], "name": "VerifierAdded", "type": "event" },

  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "address", "name": "verifier", "type": "address" }
    ], "name": "VerifierRemoved", "type": "event" },

  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "facilityId", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "submittedBy", "type": "address" }
    ], "name": "EmissionRecordSubmitted", "type": "event" },

  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "verifiedBy", "type": "address" },
      { "indexed": false, "internalType": "uint8", "name": "status", "type": "uint8" }
    ], "name": "EmissionRecordVerified", "type": "event" },

  { "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "address", "name": "_submitter", "type": "address" }
    ], "name": "registerFacility",
    "outputs": [{ "internalType": "uint256", "name": "facilityId", "type": "uint256" }],
    "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [{ "internalType": "address", "name": "_verifier", "type": "address" }],
    "name": "addVerifier", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [{ "internalType": "address", "name": "_verifier", "type": "address" }],
    "name": "removeVerifier", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [
      { "internalType": "uint256", "name": "_facilityId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_reportHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "_periodStart", "type": "uint256" },
      { "internalType": "uint256", "name": "_periodEnd", "type": "uint256" }
    ], "name": "submitEmissionRecord",
    "outputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
    "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [
      { "internalType": "uint256", "name": "_recordId", "type": "uint256" },
      { "internalType": "bool", "name": "_approved", "type": "bool" }
    ], "name": "verifyEmissionRecord", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [{ "internalType": "uint256", "name": "_recordId", "type": "uint256" }],
    "name": "getRecord",
    "outputs": [{
      "components": [
        { "internalType": "uint256", "name": "facilityId", "type": "uint256" },
        { "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "reportingPeriodStart", "type": "uint256" },
        { "internalType": "uint256", "name": "reportingPeriodEnd", "type": "uint256" },
        { "internalType": "address", "name": "submittedBy", "type": "address" },
        { "internalType": "uint256", "name": "submittedAt", "type": "uint256" },
        { "internalType": "enum EmissionsMRV.VerificationStatus", "name": "status", "type": "uint8" },
        { "internalType": "address", "name": "verifiedBy", "type": "address" },
        { "internalType": "uint256", "name": "verifiedAt", "type": "uint256" }
      ], "internalType": "struct EmissionsMRV.EmissionRecord", "name": "", "type": "tuple"
    }], "stateMutability": "view", "type": "function" },

  { "inputs": [{ "internalType": "uint256", "name": "_facilityId", "type": "uint256" }],
    "name": "getFacility",
    "outputs": [{
      "components": [
        { "internalType": "string", "name": "name", "type": "string" },
        { "internalType": "address", "name": "submitter", "type": "address" },
        { "internalType": "bool", "name": "registered", "type": "bool" },
        { "internalType": "uint256", "name": "registeredAt", "type": "uint256" }
      ], "internalType": "struct EmissionsMRV.Facility", "name": "", "type": "tuple"
    }], "stateMutability": "view", "type": "function" },

  { "inputs": [{ "internalType": "uint256", "name": "_facilityId", "type": "uint256" }],
    "name": "getRecordIdsForFacility",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view", "type": "function" },

  { "inputs": [], "name": "regulator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view", "type": "function" },

  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isVerifier",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view", "type": "function" },

  { "inputs": [], "name": "facilityCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function" },

  { "inputs": [], "name": "recordCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function" }
];