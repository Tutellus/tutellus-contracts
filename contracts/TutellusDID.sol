// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./TutellusDIDStorage.sol";
import "./interfaces/ITutellusDID.sol";

contract TutellusDID is Initializable, AccessControlUpgradeable, ERC721HolderUpgradeable, ITutellusDID, TutellusDIDStorage {

    /***************************************************************/
    // EVENTS
    /***************************************************************/

    event Forward(address indexed destination, bytes data, uint value, uint gas, bytes result);

    /***************************************************************/
    // MODIFIERS
    /***************************************************************/

    modifier forwardChecks(address destination_, address sender_) {
        require(verificationCheck(destination_), "TutellusDID: verificationCheck");
        _;
    }

    /***************************************************************/
    // PUBLIC/EXTERNAL FUNCTIONS
    /***************************************************************/

    function version() external pure returns(string memory) {
        return "0.0.1";
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    /// @notice Resend a call to another contract function
    /// @dev Make a call to function encoded in _data and address in _destination 
    /// @param destination_ Address of the contract 
    /// @param data_ Function signature and params encoded
    /// @param value_ Msg.value to be sent in call
    /// @param gas_ Gas limit sent in call
    /// @return encoded result of function call
    function forward(address destination_, bytes memory data_, uint value_, uint gas_) external returns(bytes memory) {
        bytes memory result_ = _forward(destination_, data_, value_, gas_);
        
        emit Forward(destination_, data_, value_, gas_, result_);
        
        return result_;
    }

    function verificationCheck(address destination_) public view returns(bool) {
        if (!onlyVerifiedCalls) return true;

        return controller.isVerified(destination_);
    }

    /***************************************************************/
    // INTERNAL FUNCTIONS
    /***************************************************************/

    function _forward(
        address destination_, 
        bytes memory data_, 
        uint value_, 
        uint gas_
    ) 
        internal 
        forwardChecks(destination_, _msgSender()) 
        returns (bytes memory) 
    {
        (bool success_, bytes memory result_) = destination_.call{value: value_, gas: gas_}(data_);
        
        if (!success_) {
            string memory msg_ = _getRevertMsg(result_);
            require(success_, msg_);
        }
        
        return result_;
    }

    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return 'Transaction reverted silently';

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    /***************************************************************/
    // INIT FUNCTIONS
    /***************************************************************/

    function initialize(address controller_, address owner, address master) initializer public {
        __AccessControl_init();
        __ERC721Holder_init();
        __TutellusDID_init(controller_, owner, master);
    }

    function __TutellusDID_init(address controller_, address owner, address master) initializer internal {
        _setupRole(DEFAULT_ADMIN_ROLE, master);
        _setupRole(OWNER_ROLE, owner);
        _setupRole(OWNER_ROLE, master);
        _setupRole(MASTER_ROLE, master);
        __TutellusDID_init_unchained(controller_);
    }

    function __TutellusDID_init_unchained(address controller_) initializer internal {
        controller = TutellusController(controller_);
    }
}