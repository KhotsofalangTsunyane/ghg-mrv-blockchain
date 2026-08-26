// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EmissionsMRV
/// @notice Blockchain-based Monitoring, Reporting and Verification system for
///         greenhouse gas (GHG) emissions reporting. Facilities register and
///         submit hashed emissions records; regulators manage roles;
///         independent verifiers attest to record validity.
/// @dev Only hashes of emissions reports are stored on-chain. Raw reports are
///      kept off-chain (e.g. IPFS) for privacy of commercially sensitive data.
contract EmissionsMRV {

    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------
    address public regulator;

    mapping(address => bool) public isVerifier;
    mapping(address => bool) public isFacilitySubmitter;

    // ---------------------------------------------------------------------
    // Data structures
    // ---------------------------------------------------------------------

    struct Facility {
        string name;
        address submitter;      // wallet authorised to submit for this facility
        bool registered;
        uint256 registeredAt;
    }

    enum VerificationStatus { Pending, Verified, Rejected }

    struct EmissionRecord {
        uint256 facilityId;
        bytes32 reportHash;     // keccak256 hash of the off-chain emissions report
        uint256 reportingPeriodStart;
        uint256 reportingPeriodEnd;
        address submittedBy;
        uint256 submittedAt;
        VerificationStatus status;
        address verifiedBy;
        uint256 verifiedAt;
    }

    // facilityId => Facility
    mapping(uint256 => Facility) public facilities;
    uint256 public facilityCount;

    // recordId => EmissionRecord
    mapping(uint256 => EmissionRecord) public emissionRecords;
    uint256 public recordCount;

    // facilityId => list of recordIds (for retrieval by facility)
    mapping(uint256 => uint256[]) private facilityRecordIds;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event FacilityRegistered(uint256 indexed facilityId, string name, address indexed submitter);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event EmissionRecordSubmitted(
        uint256 indexed recordId,
        uint256 indexed facilityId,
        bytes32 reportHash,
        address indexed submittedBy
    );
    event EmissionRecordVerified(uint256 indexed recordId, address indexed verifiedBy, VerificationStatus status);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------
    modifier onlyRegulator() {
        require(msg.sender == regulator, "Caller is not the regulator");
        _;
    }

    modifier onlyVerifier() {
        require(isVerifier[msg.sender], "Caller is not an authorised verifier");
        _;
    }

    modifier onlyFacilitySubmitter(uint256 _facilityId) {
        require(facilities[_facilityId].registered, "Facility not registered");
        require(
            facilities[_facilityId].submitter == msg.sender,
            "Caller is not the authorised submitter for this facility"
        );
        _;
    }

    modifier validFacility(uint256 _facilityId) {
        require(_facilityId > 0 && _facilityId <= facilityCount, "Invalid facility id");
        _;
    }

    modifier validRecord(uint256 _recordId) {
        require(_recordId > 0 && _recordId <= recordCount, "Invalid record id");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor() {
        regulator = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Regulator functions: role management
    // ---------------------------------------------------------------------

    /// @notice Register a new manufacturing facility and its authorised submitter wallet.
    function registerFacility(string calldata _name, address _submitter)
        external
        onlyRegulator
        returns (uint256 facilityId)
    {
        require(bytes(_name).length > 0, "Facility name required");
        require(_submitter != address(0), "Invalid submitter address");

        facilityCount += 1;
        facilityId = facilityCount;

        facilities[facilityId] = Facility({
            name: _name,
            submitter: _submitter,
            registered: true,
            registeredAt: block.timestamp
        });

        isFacilitySubmitter[_submitter] = true;

        emit FacilityRegistered(facilityId, _name, _submitter);
    }

    /// @notice Grant verifier (auditor) privileges to an address.
    function addVerifier(address _verifier) external onlyRegulator {
        require(_verifier != address(0), "Invalid verifier address");
        isVerifier[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    /// @notice Revoke verifier privileges from an address.
    function removeVerifier(address _verifier) external onlyRegulator {
        isVerifier[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    // ---------------------------------------------------------------------
    // Facility functions: submit emissions records
    // ---------------------------------------------------------------------

    /// @notice Submit a hash of an emissions report for a given facility and period.
    /// @dev The raw report should be stored off-chain (e.g. IPFS); only its hash is stored here.
    function submitEmissionRecord(
        uint256 _facilityId,
        bytes32 _reportHash,
        uint256 _periodStart,
        uint256 _periodEnd
    )
        external
        validFacility(_facilityId)
        onlyFacilitySubmitter(_facilityId)
        returns (uint256 recordId)
    {
        require(_reportHash != bytes32(0), "Report hash required");
        require(_periodEnd >= _periodStart, "Invalid reporting period");
        require(_periodEnd <= block.timestamp, "Reporting period cannot be in the future");

        recordCount += 1;
        recordId = recordCount;

        emissionRecords[recordId] = EmissionRecord({
            facilityId: _facilityId,
            reportHash: _reportHash,
            reportingPeriodStart: _periodStart,
            reportingPeriodEnd: _periodEnd,
            submittedBy: msg.sender,
            submittedAt: block.timestamp,
            status: VerificationStatus.Pending,
            verifiedBy: address(0),
            verifiedAt: 0
        });

        facilityRecordIds[_facilityId].push(recordId);

        emit EmissionRecordSubmitted(recordId, _facilityId, _reportHash, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Verifier functions: attest to records
    // ---------------------------------------------------------------------

    /// @notice Verify or reject a submitted emission record. Once verified/rejected,
    ///         a record cannot be re-verified, preventing overwrite of audit history.
    function verifyEmissionRecord(uint256 _recordId, bool _approved)
        external
        onlyVerifier
        validRecord(_recordId)
    {
        EmissionRecord storage record = emissionRecords[_recordId];
        require(record.status == VerificationStatus.Pending, "Record already finalised");

        record.status = _approved ? VerificationStatus.Verified : VerificationStatus.Rejected;
        record.verifiedBy = msg.sender;
        record.verifiedAt = block.timestamp;

        emit EmissionRecordVerified(_recordId, msg.sender, record.status);
    }

    // ---------------------------------------------------------------------
    // Read functions: retrieval for verification / audit
    // ---------------------------------------------------------------------

    function getRecord(uint256 _recordId)
        external
        view
        validRecord(_recordId)
        returns (EmissionRecord memory)
    {
        return emissionRecords[_recordId];
    }

    function getFacility(uint256 _facilityId)
        external
        view
        validFacility(_facilityId)
        returns (Facility memory)
    {
        return facilities[_facilityId];
    }

    function getRecordIdsForFacility(uint256 _facilityId)
        external
        view
        validFacility(_facilityId)
        returns (uint256[] memory)
    {
        return facilityRecordIds[_facilityId];
    }
}