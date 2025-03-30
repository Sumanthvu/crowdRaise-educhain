// File: ignition/modules/StudyDAO.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const fs = require("fs");
const path = require("path");

module.exports = buildModule("StudyDAOModule", (m) => {
  const studyDAO = m.contract("StudyDAO");

  m.call(studyDAO, "_", {
    afterDeploy: async () => {
      const dir = path.join(__dirname, "../../client/src/contract_data/");
      
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, "StudyDAO-address.json"),
        JSON.stringify({ address: studyDAO.target,deployedAt: new Date().toISOString() }, null, 2) );

      const artifact = await hre.artifacts.readArtifact("StudyDAO");
      fs.writeFileSync(path.join(dir, "StudyDAO.json"),JSON.stringify(artifact, null, 2)
      );
      console.log(` Contract data is now saved to ${dir}`);
    }
  });
  return { studyDAO };
});