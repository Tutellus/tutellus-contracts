// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ITutellusIDO {
    /// @notice Emitted when a prefund is done
    /// @dev Can be done from operator
    /// @param funder Address of the prefunder
    /// @param amount Amount added to prefund
    event Prefund(address indexed funder, uint256 amount);

    /// @notice Emitted when a withdraw of prefund is done
    /// @dev Still participates in IDO, prefunded > minPrefund
    /// @param funder Address of the prefunder
    /// @param amount Amount removed from prefund
    event Withdraw(address indexed funder, uint256 amount);

    /// @notice Emitted when a prefunder withdraw all prefunds
    /// @dev Stop participating in IDO, prefunded = 0
    /// @param funder Address of the prefunder
    event RemovePrefunder(address indexed funder);

    /// @notice Emitted when IDO distribution is setted
    /// @dev IDO is closed
    /// @param merkleRoot Root hash of the merkle tree
    /// @param uri IPFS CID (ipfs://<CID>)
    event UpdateMerkleRoot(bytes32 merkleRoot, string uri);

    /// @notice Emitted when IDO token is updated
    /// @param idoToken Address of ERC20 IDO token
    event UpdateIdoToken(address idoToken);

    /// @notice Emitted when vesting configuration dates are updated
    /// @param startDate Vesting start time date
    /// @param endDate Vesting end time date
    /// @param openDate Open time for IDO
    /// @param cliffTime Amount of no claimable time from startDate
    event UpdateVesting(
        uint256 startDate,
        uint256 endDate,
        uint256 openDate,
        uint256 cliffTime
    );

    /// @notice Emitted when claims of project vested token
    /// @param index Index of leave in merkle tree
    /// @param account Address of the prefunder
    /// @param amount Amount claimed in this claim
    /// @param allocation Amount of total allocation
    /// @param withdraw Amount of total refund //TBD: change to refund
    /// @param energy Amount of energy when IDO closed
    event Claim(
        uint256 index,
        address account,
        uint256 amount,
        uint256 allocation,
        uint256 withdraw,
        uint256 energy
    );

    /// @notice Emitted when withdraw refund (prefund left)
    /// @param index Index of leave in merkle tree
    /// @param account Address of the prefunder
    /// @param allocation Amount of total allocation
    /// @param refund Amount of total refund
    /// @param energy Amount of energy when IDO closed
    event WithdrawLeft(
        uint256 index,
        address account,
        uint256 allocation,
        uint256 refund,
        uint256 energy
    );

    /// @notice Emitted when an IDO open/close
    /// @dev Closes when updateMerkleRoot
    /// @param closed closed variable status
    event Closed(bool closed);

    /// @notice Emitted when launchpad user accepts T&C
    /// @param idoUser Address of the launchpad user
    event AcceptTermsAndConditions(address idoUser);

    /// @notice Emitted when an prefunder approves an operator
    /// @dev Operator can prefund on behalf of prefunder
    /// @param owner Address of the prefunder
    /// @param operator Address of the operator
    /// @param approved Allowance status
    event OperatorApproval(address owner, address operator, bool approved);

    //   function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
    //   function PAUSER_ROLE (  ) external view returns ( bytes32 );
    //   function UPGRADER_ROLE (  ) external view returns ( bytes32 );

    /// @notice Launchpad user accept T&C
    /// @dev Cannot interact with IDO if not accepted
    function acceptTermsAndConditions() external;

    /// @notice Returns amount available to claim
    /// @dev Released minus claimed
    /// @param account Address of the prefunder
    /// @param allocation Total allocation of the prefunder
    /// @return availableAmount Amount available to claim
    function available(address account, uint256 allocation)
        external
        view
        returns (uint256);

    /// @notice Claim project vested tokens
    /// @dev Can be claimed by thirds
    /// @param index Index of leave in merkle tree
    /// @param account Address of the prefunder
    /// @param allocation Amount of total allocation
    /// @param refund Amount of total refund
    /// @param energy Amount of energy when IDO closed
    /// @param merkleProof Array of merkleProofs
    function claim(
        uint256 index,
        address account,
        uint256 allocation,
        uint256 refund,
        uint256 energy,
        bytes32[] calldata merkleProof
    ) external;

    /// @notice Returns already claimed amount of account
    /// @param account Address of the prefunder
    /// @return claimedAmount Amount already claimed
    function claimed(address account) external view returns (uint256);

    /// @notice Returns time of cliff (no claimable)
    /// @return cliffTime
    function cliffTime() external view returns (uint256);

    /// @notice Close an IDO to start with distribution
    /// @dev Sets closed to true
    function close() external;

    /// @notice Returns whether or not an IDO is closed
    /// @return closed True if closed, false if not closed
    function closed() external view returns (bool);

    // function config() external view returns (address);

    /// @notice Returns vesting end time date
    /// @return endDate
    function endDate() external view returns (uint256);

    /// @notice Returns amount needed by the project
    /// @return fundingAmount
    function fundingAmount() external view returns (uint256);

    /// @notice Returns total prefunded amount
    /// @param account Address of the launchpad user
    /// @return accepted True if accepted, false if not
    function getAcceptedTermsAndConditions(address account)
        external
        view
        returns (bool);

    /// @notice Returns prefunder prefunded amount
    /// @param prefunder Address of the prefunder
    /// @return prefunded Amount prefunded
    function getPrefunded(address prefunder) external view returns (uint256);

    /// @notice Returns address of the project token
    /// @return idoToken
    function idoToken() external view returns (address);

    /// @notice Initializes proxy
    /// @param rolemanager Address of AccessControl contract
    /// @param fundingAmount Amount needed by the project
    /// @param minPrefund Minimum amount for a prefunder to participate
    /// @param idoToken Address of the project token
    /// @param prefundToken Address of the token to prefund
    /// @param startDate Vesting start time date
    /// @param endDate Vesting end time date
    /// @param openDate Open time for IDO
    /// @param cliffTime Amount of no claimable time from startDate
    function initialize(
        address rolemanager,
        uint256 fundingAmount,
        uint256 minPrefund,
        address idoToken,
        address prefundToken,
        uint256 startDate,
        uint256 endDate,
        uint256 openDate,
        uint256 cliffTime
    ) external;

    /// @notice Returns if an address is operator of an owner
    /// @param owner Address of the prefunder
    /// @param operator Address of the operator
    /// @return isOperator True if operator, false if not
    function isOperator(address owner, address operator)
        external
        view
        returns (bool);

    /// @notice Returns root hash of the merkle tree
    /// @return merkleRoot
    function merkleRoot() external view returns (bytes32);

    /// @notice Returns minimum prefunded amount allowed
    /// @return minPrefund
    function minPrefund() external view returns (uint256);

    /// @notice Reopen IDO in case of mistake closing
    /// @dev Sets closed to false again
    function open() external;

    /// @notice Returns IDO open time date
    /// @return openDate
    function openDate() external view returns (uint256);

    /// @notice Prefund an IDO
    /// @dev prefundAmount must be greater than minPrefund
    /// @param prefunder Address of the prefunder
    /// @param prefundAmount Amount to prefund
    function prefund(address prefunder, uint256 prefundAmount) external;

    /// @notice Address of the token used to fund the project
    /// @return prefundToken
    function prefundToken() external view returns (address);

    /// @notice Returns total prefunded amount
    /// @return prefunded
    function prefunded() external view returns (uint256);

    /// @notice Returns released amount from total allocation
    /// @param allocation Total allocation amount
    /// @return released Amount released
    function released(uint256 allocation) external view returns (uint256);

    /// @notice Set an address as operator
    /// @dev Operator is allowed to prefund on behalf of prefunder
    /// @param operator Address of the prefunder
    /// @param approved Amount to prefund
    function setOperator(address operator, bool approved) external;

    /// @notice Returns vesting start time date
    /// @return startDate
    function startDate() external view returns (uint256);

    /// @notice Syncs real balanceOf with prefunded amount
    /// @dev In case someone transfers by mistake
    function sync() external;

    /// @notice Set merkle root used to verify JSON in uri
    /// @dev Closes automatically the IDO
    /// @param merkleRoot Root hash of the merkle tree
    /// @param uri IPFS CID (ipfs://<CID>)
    function updateMerkleRoot(bytes32 merkleRoot, string calldata uri) external;

    /// @notice Set idoToken address
    /// @param idoToken Address of ERC20 IDO token
    function updateIdoToken(address idoToken) external;

    /// @notice Set vesting times configuration
    /// @param startDate Vesting start time date
    /// @param endDate Vesting end time date
    /// @param openDate Open time for IDO
    /// @param cliffTime Amount of no claimable time from startDate
    function updateVesting(uint256 openDate, uint256 startDate, uint256 endDate, uint256 cliffTime) external;

    /// @notice Returns IPFS CID (ipfs://<CID>)
    /// @return uri
    function uri() external view returns (string calldata);

    /// @notice Withdraw certain amount from prefunded
    /// @dev prefunded after withdraw must be greater than minPrefund
    /// @param amount Amount to withdraw
    function withdraw(uint256 amount) external;

    /// @notice Withdraw all prefunded amount
    function withdrawAll() external;

    /// @notice Withdraw project funds after closing IDO
    /// @dev open in case prefunded < fundingAmount
    /// @param projectWallet Address of the project
    /// @param fundAmount Amount of prefundToken to transfer
    function withdrawProject(address projectWallet, uint256 fundAmount)
        external;

    /// @notice Claim prefunded amount not used for allocation
    /// @dev Can be claimed by thirds
    /// @param index Index of leave in merkle tree
    /// @param account Address of the prefunder
    /// @param allocation Amount of total allocation
    /// @param refund Amount of total refund
    /// @param energy Amount of energy when IDO closed
    /// @param merkleProof Array of merkleProofs
    function withdrawLeft(
        uint256 index,
        address account,
        uint256 allocation,
        uint256 refund,
        uint256 energy,
        bytes32[] calldata merkleProof
    ) external;

    /// @notice Returns if account already withdrawLeft
    /// @param account Address of the prefunder
    /// @return withdrawn True if already wihtdrawLeft, false if not
    function withdrawn(address account) external view returns (bool);
}
