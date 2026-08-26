const hre = require("hardhat");

async function main() {
  console.log("=== TEST SCRIPT START ===");
  console.log("Hello from test script");
  console.log("=== TEST SCRIPT END ===");
}

main()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });