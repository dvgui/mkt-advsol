// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDanteToken is IERC20 {
	function burn(uint256 amount) external;

	function burnFrom(address account, uint256 amount) external;

	function mint(address to, uint256 amount) external;
}
