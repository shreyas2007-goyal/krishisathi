// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KisanEscrowTraceability
 * @notice Decentralized crop provenance registry and B2C farm-gate escrow contract for KisanSAATHI.
 * @dev Designed for Polygon PoS / EVM-compatible L2 networks with low gas fees.
 */
contract KisanEscrowTraceability {
    enum EscrowStatus {
        Created,
        Funded,
        Delivered,
        Released,
        Disputed,
        Refunded
    }

    struct HarvestBatch {
        string batchId;
        address farmer;
        string cropName;
        string originDistrict;
        uint256 quantityKg;
        bytes32 metadataHash; // SHA-256 / Keccak hash of harvest & lab report
        uint256 timestamp;
        bool verified;
    }

    struct EscrowDeal {
        uint256 dealId;
        string batchId;
        address payable farmer;
        address payable buyer;
        uint256 amountWei;
        uint256 quantityKg;
        EscrowStatus status;
        uint256 createdAt;
    }

    address public admin;
    uint256 public nextDealId = 1;

    mapping(string => HarvestBatch) public harvestBatches;
    mapping(uint256 => EscrowDeal) public escrowDeals;

    event BatchRegistered(
        string indexed batchId,
        address indexed farmer,
        string cropName,
        uint256 quantityKg,
        bytes32 metadataHash
    );
    event EscrowCreated(
        uint256 indexed dealId,
        string batchId,
        address indexed buyer,
        address indexed farmer,
        uint256 amountWei
    );
    event EscrowReleased(uint256 indexed dealId, address indexed farmer, uint256 amountWei);
    event EscrowDisputed(uint256 indexed dealId, address indexed initiator);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only KisanSAATHI admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Register a harvested crop batch on-chain for immutable consumer traceability.
     */
    function registerHarvestBatch(
        string calldata batchId,
        string calldata cropName,
        string calldata originDistrict,
        uint256 quantityKg,
        bytes32 metadataHash
    ) external {
        require(bytes(batchId).length > 0, "Invalid batchId");
        require(harvestBatches[batchId].timestamp == 0, "Batch already registered");

        harvestBatches[batchId] = HarvestBatch({
            batchId: batchId,
            farmer: msg.sender,
            cropName: cropName,
            originDistrict: originDistrict,
            quantityKg: quantityKg,
            metadataHash: metadataHash,
            timestamp: block.timestamp,
            verified: true
        });

        emit BatchRegistered(batchId, msg.sender, cropName, quantityKg, metadataHash);
    }

    /**
     * @notice Buyer locks funds in smart contract escrow for a specific B2C harvest batch.
     */
    function createEscrowDeal(
        string calldata batchId,
        address payable farmer,
        uint256 quantityKg
    ) external payable returns (uint256) {
        require(msg.value > 0, "Escrow amount must be > 0");
        require(farmer != address(0), "Invalid farmer address");
        require(harvestBatches[batchId].timestamp != 0, "Batch not registered");

        uint256 dealId = nextDealId++;
        escrowDeals[dealId] = EscrowDeal({
            dealId: dealId,
            batchId: batchId,
            farmer: farmer,
            buyer: payable(msg.sender),
            amountWei: msg.value,
            quantityKg: quantityKg,
            status: EscrowStatus.Funded,
            createdAt: block.timestamp
        });

        emit EscrowCreated(dealId, batchId, msg.sender, farmer, msg.value);
        return dealId;
    }

    /**
     * @notice Buyer confirms receipt of produce, releasing locked escrow funds directly to farmer.
     */
    function releaseEscrow(uint256 dealId) external {
        EscrowDeal storage deal = escrowDeals[dealId];
        require(msg.sender == deal.buyer, "Only buyer can release funds");
        require(deal.status == EscrowStatus.Funded, "Deal not in Funded state");

        deal.status = EscrowStatus.Released;
        (bool success, ) = deal.farmer.call{value: deal.amountWei}("");
        require(success, "Transfer to farmer failed");

        emit EscrowReleased(dealId, deal.farmer, deal.amountWei);
    }

    /**
     * @notice Raise a dispute if produce quality or weight does not match agreed terms.
     */
    function raiseDispute(uint256 dealId) external {
        EscrowDeal storage deal = escrowDeals[dealId];
        require(
            msg.sender == deal.buyer || msg.sender == deal.farmer,
            "Only deal participant"
        );
        require(deal.status == EscrowStatus.Funded, "Cannot dispute in current state");

        deal.status = EscrowStatus.Disputed;
        emit EscrowDisputed(dealId, msg.sender);
    }
}
