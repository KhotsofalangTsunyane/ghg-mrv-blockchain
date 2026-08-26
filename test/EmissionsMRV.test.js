const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EmissionsMRV", function () {
  let mrv, regulator, facilityWallet, verifier, outsider;

  beforeEach(async function () {
    [regulator, facilityWallet, verifier, outsider] = await ethers.getSigners();
    const EmissionsMRV = await ethers.getContractFactory("EmissionsMRV");
    mrv = await EmissionsMRV.deploy();
    await mrv.waitForDeployment();
  });

  it("sets the deployer as regulator", async function () {
    expect(await mrv.regulator()).to.equal(regulator.address);
  });

  it("lets the regulator register a facility", async function () {
    await expect(mrv.registerFacility("Test Plant", facilityWallet.address))
      .to.emit(mrv, "FacilityRegistered")
      .withArgs(1, "Test Plant", facilityWallet.address);

    const facility = await mrv.getFacility(1);
    expect(facility.name).to.equal("Test Plant");
    expect(facility.registered).to.equal(true);
  });

  it("prevents a non-regulator from registering a facility", async function () {
    await expect(
      mrv.connect(outsider).registerFacility("Rogue Plant", outsider.address)
    ).to.be.revertedWith("Caller is not the regulator");
  });

  it("lets the authorised submitter submit an emissions record", async function () {
    await mrv.registerFacility("Test Plant", facilityWallet.address);

    const reportHash = ethers.keccak256(ethers.toUtf8Bytes("emissions-report-q1-2026"));
    const now = Math.floor(Date.now() / 1000);

    await expect(
      mrv.connect(facilityWallet).submitEmissionRecord(1, reportHash, now - 3600, now)
    ).to.emit(mrv, "EmissionRecordSubmitted");

    const record = await mrv.getRecord(1);
    expect(record.reportHash).to.equal(reportHash);
    expect(record.facilityId).to.equal(1);
  });

  it("prevents an unauthorised wallet from submitting for a facility", async function () {
    await mrv.registerFacility("Test Plant", facilityWallet.address);
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes("fake-report"));
    const now = Math.floor(Date.now() / 1000);

    await expect(
      mrv.connect(outsider).submitEmissionRecord(1, reportHash, now - 3600, now)
    ).to.be.revertedWith("Caller is not the authorised submitter for this facility");
  });

  it("lets an authorised verifier approve a record and blocks re-verification", async function () {
    await mrv.registerFacility("Test Plant", facilityWallet.address);
    await mrv.addVerifier(verifier.address);

    const reportHash = ethers.keccak256(ethers.toUtf8Bytes("report-1"));
    const now = Math.floor(Date.now() / 1000);
    await mrv.connect(facilityWallet).submitEmissionRecord(1, reportHash, now - 3600, now);

    await expect(mrv.connect(verifier).verifyEmissionRecord(1, true))
      .to.emit(mrv, "EmissionRecordVerified")
      .withArgs(1, verifier.address, 1); // 1 = Verified

    // Attempting to verify again should fail - protects audit history.
    await expect(
      mrv.connect(verifier).verifyEmissionRecord(1, false)
    ).to.be.revertedWith("Record already finalised");
  });

  it("rejects submission with a zero report hash", async function () {
    await mrv.registerFacility("Test Plant", facilityWallet.address);
    const now = Math.floor(Date.now() / 1000);

    await expect(
      mrv.connect(facilityWallet).submitEmissionRecord(1, ethers.ZeroHash, now - 3600, now)
    ).to.be.revertedWith("Report hash required");
  });
});