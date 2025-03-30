const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const ContractFactory = await ethers.getContractFactory("StudyDAO");

  const contract =
    await ContractFactory.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`Contract deployed to: ${contractAddress}`);

  saveFrontendFiles(contract, "StudyDAO");
}

function saveFrontendFiles(contract, name) {
  const contractsDir = path.join(__dirname, "../client/src/contract_data/");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, `${name}-address.json`),
    JSON.stringify({ address: contract.target }, null, 2) 
  );

  const contractArtifact = artifacts.readArtifactSync(name);
  fs.writeFileSync(
    path.join(contractsDir, `${name}.json`),
    JSON.stringify(contractArtifact, null, 2)
  );

  // console.log(`Contract artifacts saved to ${contractsDir}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



