// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/// @custom:security-contact security@dantegames.com
contract HeroNFT is
	Initializable,
	ERC721Upgradeable,
	ERC721EnumerableUpgradeable,
	PausableUpgradeable,
	AccessControlUpgradeable,
	ERC721BurnableUpgradeable,
	UUPSUpgradeable
{
	using CountersUpgradeable for CountersUpgradeable.Counter;

	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
	bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

	CountersUpgradeable.Counter private _tokenIdCounter;
	bool public whitelistEnabled;

	mapping(uint256 => uint256) public tokenTypes;
	mapping(address => bool) public whitelistAddress;

	mapping(uint256 => CountersUpgradeable.Counter) public typeSupply;
	mapping(uint256 => uint256) public cap;

	event Mint(address indexed owner, uint tokenId, uint tokenType);
	event Whitelist(bool enabled);
	event AddedWhitelist(address _address);
	event RemovedWhitelist(address _address);
	event CapUpdated(uint tokenType, uint newCap);

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize(
		string memory _name,
		string memory _symbol
	) public initializer {
		__ERC721_init(_name, _symbol);
		__ERC721Enumerable_init();
		__Pausable_init();
		__AccessControl_init();
		__ERC721Burnable_init();
		__UUPSUpgradeable_init();

		_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
		_grantRole(PAUSER_ROLE, msg.sender);
		_grantRole(WHITELIST_ROLE, msg.sender);
		_grantRole(MINTER_ROLE, msg.sender);
		_grantRole(UPGRADER_ROLE, msg.sender);
		whitelistEnabled = true;
		whitelistAddress[address(0)] = true;
	}

	function _baseURI() internal pure override returns (string memory) {
		return "https://nft-dev.api.dev.dantegames.com/api/p/nft/hero/";
	}

	function pause() external onlyRole(PAUSER_ROLE) {
		_pause();
	}

	function unpause() external onlyRole(PAUSER_ROLE) {
		_unpause();
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

	function updateCap(
		uint tokenType,
		uint newCap
	) external onlyRole(WHITELIST_ROLE) {
		require(
			newCap > typeSupply[tokenType].current(),
			"Cap is smaller than supply"
		);
		cap[tokenType] = newCap;
		emit CapUpdated(tokenType, newCap);
	}

	function safeMint(address to, uint tokenType) public onlyRole(MINTER_ROLE) {
		CountersUpgradeable.Counter storage _tokenType = typeSupply[tokenType];

		require(
			cap[tokenType] == 0 || cap[tokenType] > _tokenType.current(),
			"Hero Cap reached for that type"
		);
		uint tokenId = _tokenIdCounter.current();
		_tokenIdCounter.increment();
		tokenTypes[tokenId] = tokenType;
		_tokenType.increment();
		_safeMint(to, tokenId);

		emit Mint(to, tokenId, tokenType);
	}

	function _beforeTokenTransfer(
		address from,
		address to,
		uint tokenId,
		uint batchSize
	)
		internal
		override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
		whenNotPaused
	{
		if (whitelistEnabled) {
			require(
				whitelistAddress[from] || whitelistAddress[to],
				"Transfer Not Allowed"
			);
		}
		super._beforeTokenTransfer(from, to, tokenId, batchSize);
	}

	function _authorizeUpgrade(
		address newImplementation
	) internal override onlyRole(UPGRADER_ROLE) {}

	// The following functions are overrides required by Solidity.

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(
			ERC721Upgradeable,
			ERC721EnumerableUpgradeable,
			AccessControlUpgradeable
		)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}
