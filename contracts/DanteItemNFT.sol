// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @custom:security-contact security@dantegames.com
contract DanteItemNFT is
	Initializable,
	ERC1155Upgradeable,
	PausableUpgradeable,
	AccessControlUpgradeable,
	ERC1155BurnableUpgradeable,
	ERC1155SupplyUpgradeable,
	UUPSUpgradeable
{
	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
	bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

	bool public whitelistEnabled;
	mapping(address => bool) public whitelistAddress;

	mapping(uint => uint) public cap;

	event Whitelist(bool enabled);
	event AddedWhitelist(address _address);
	event RemovedWhitelist(address _address);
	event CapUpdated(uint tokenType, uint newCap);

	error ItemCapReached(uint id);

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize() public initializer {
		__ERC1155_init("https://nft-dev.api.dev.dantegames.com/api/p/nft/items/");
		__Pausable_init();
		__AccessControl_init();
		__ERC1155Burnable_init();
		__ERC1155Supply_init();
		__UUPSUpgradeable_init();

		_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
		_grantRole(PAUSER_ROLE, msg.sender);
		_grantRole(MINTER_ROLE, msg.sender);
		_grantRole(UPGRADER_ROLE, msg.sender);
		_grantRole(WHITELIST_ROLE, msg.sender);
		whitelistEnabled = true;
		whitelistAddress[address(0)] = true;
	}

	function pause() public onlyRole(PAUSER_ROLE) {
		_pause();
	}

	function unpause() public onlyRole(PAUSER_ROLE) {
		_unpause();
	}

	function mint(
		address account,
		uint id,
		uint amount,
		bytes memory data
	) public onlyRole(MINTER_ROLE) {
		if (cap[id] != 0 && super.totalSupply(id) + amount > cap[id]) {
			revert ItemCapReached(id);
		}
		_mint(account, id, amount, data);
	}

	function mintBatch(
		address to,
		uint[] memory ids,
		uint[] memory amounts,
		bytes memory data
	) public onlyRole(MINTER_ROLE) {
		require(
			ids.length == amounts.length,
			"ERC1155: ids and amounts length mismatch"
		);
		for (uint256 i = 0; i < ids.length; i++) {
			if (i != ids.length - 1) {
				require(
					ids[i] < ids[i + 1],
					"ERC1155: ids must be in strictly ascending order"
				);
			}
			if (
				cap[ids[i]] != 0 &&
				super.totalSupply(ids[i]) + amounts[i] >= cap[ids[i]]
			) {
				revert ItemCapReached(ids[i]);
			}
		}
		_mintBatch(to, ids, amounts, data);
	}

	function setWhitelistEnabled(
		bool enabled
	) external onlyRole(WHITELIST_ROLE) {
		whitelistEnabled = enabled;
		emit Whitelist(enabled);
	}

	function addWhitelist(address _address) external onlyRole(WHITELIST_ROLE) {
		whitelistAddress[_address] = true;
		emit AddedWhitelist(_address);
	}

	function removeWhitelist(
		address _address
	) external onlyRole(WHITELIST_ROLE) {
		delete whitelistAddress[_address];
		emit RemovedWhitelist(_address);
	}

	function updateCap(uint id, uint newCap) external onlyRole(WHITELIST_ROLE) {
		require(newCap > super.totalSupply(id), "Cap is smaller than supply");
		cap[id] = newCap;
		emit CapUpdated(id, newCap);
	}

	function _beforeTokenTransfer(
		address operator,
		address from,
		address to,
		uint[] memory ids,
		uint[] memory amounts,
		bytes memory data
	)
		internal
		override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
		whenNotPaused
	{
		if (whitelistEnabled) {
			require(
				whitelistAddress[from] || whitelistAddress[to],
				"Transfer Not Allowed"
			);
		}
		super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
	}

	function _authorizeUpgrade(
		address newImplementation
	) internal override onlyRole(UPGRADER_ROLE) {}

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC1155Upgradeable, AccessControlUpgradeable)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}
