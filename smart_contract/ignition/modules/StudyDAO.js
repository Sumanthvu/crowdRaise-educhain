require("@nomicfoundation/hardhat-ignition-ethers");

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("StudyDAO", (m) => {
  const studyDAO = m.contract("StudyDAO");

  return { studyDAO };
});