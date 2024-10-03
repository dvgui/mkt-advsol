// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @custom:security-contact security@dantegames.com
contract DanteToken is
	ERC20,
	ERC20Burnable,
	ERC20Capped,
	AccessControl,
	ERC20Permit
{
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor(
		address defaultAdmin,
		uint limit,
		string memory name,
		string memory symbol
	) ERC20(name, symbol) ERC20Capped(limit) ERC20Permit(name) {
		require(defaultAdmin != address(0), "Invalid admin");
		_grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
		_grantRole(MINTER_ROLE, defaultAdmin);
	}

	function mint(address to, uint amount) external onlyRole(MINTER_ROLE) {
		_mint(to, amount);
	}

	function _mint(
		address account,
		uint amount
	) internal override(ERC20Capped, ERC20) {
		super._mint(account, amount);
	}
}
