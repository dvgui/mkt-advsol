// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @custom:security-contact security@dantegames.com
contract Marketplace is
	Initializable,
	PausableUpgradeable,
	AccessControlUpgradeable,
	ReentrancyGuardUpgradeable,
	UUPSUpgradeable
{
	using SafeERC20Upgradeable for IERC20Upgradeable;

	struct Auction {
		// address of the seller
		address seller;
		// address of the token to sale
		address nftAddress;
		// if the auction is for ERC721 - true - or ERC1155 - false
		bool isErc721;
		// ID of the NFT
		uint tokenId;
		// Timestamp of end of auction
		uint endedAt;
		// Timestamp, in which the auction started.
		uint startedAt;
		// for ERC-1155 - how many tokens are for sale
		uint amount;
		// Actual highest bidder
		address bidder;
		// asking price
		uint askingPrice;
		// maximum offer
		uint highestBid;
	}

	struct DutchAuction {
		address seller;
		address nftAddress;
		bool isErc721;
		uint tokenId;
		uint endedAt;
		uint startedAt;
		uint amount;
		uint startPrice;
		uint endPrice;
		bool isSettled;
	}


	modifier canList() {
		if (!(listingOpen || hasRole(STORE_ADMIN_ROLE, msg.sender))) {
			revert NewListingsPaused();
		}
		_;
	}

	mapping(bytes32 => Auction) private _auctions;
	mapping(bytes32 => DutchAuction) private _dutchAuctions;
	mapping(address => bool) private _allowedNfts;

	uint private _auctionCount;

	bytes32[] private _openAuctions;

	bool public listingOpen;

	// in percents, what's the fee for the auction house, 1% - 100, 100% - 10000, range 1-10000 means 0.01% - 100%
	uint public auctionFee;
	uint public auctionCancellationFee;

	uint public minAuctionDuration;
	uint public maxAuctionDuration;

	address public erc20Address;

	address public auctionFeeRecipient;

	uint private constant _auctionFeeDenominator = 100_00;
	uint private constant _auctionMinimumBidIncrement = 5_00;

	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
	bytes32 public constant STORE_ADMIN_ROLE = keccak256("STORE_ADMIN_ROLE");
	bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
	bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

	event AuctionCreated(
		bool indexed isErc721,
		address indexed nftAddress,
		uint indexed tokenId,
		bytes32 id,
		uint amount,
		uint endedAt,
		uint askingPrice
	);

	event AuctionBid(address indexed buyer, uint indexed amount, bytes32 id);

	event AuctionSettled(bytes32 id);

	event AuctionCancelled(bytes32 id);

	event CancellationFeeChanged(uint fee);
	event AuctionFeeChanged(uint fee);
	event TreasuryChanged(address treasury);
	event DurationChanged(uint min, uint max);

	event AddedNft(address nft);
	event RemovedNft(address nft);

	event ListingsPaused();
	event ListingsResumed();

	error InvalidAuctionFee();
	error InvalidCancellationFee();
	error InvalidRecipientAddress();
	error InvalidTokenAddress();
	error InvalidDurationRestrictions();
	error NoOpenAuctions();
	error InvalidTokenAmount();
	error InitialAskingPriceMustBeNonZero();
	error AuctionAlreadyExistedRorCurrentAuctionId();
	error NFTUnauthorizedForSale();
	error InvalidAuctionDuration();
	error BidIsSmallerThanRequiredIncrementAborting();
	error AuctionHasAlreadyEndedUnableToProcessBidAborting();
	error ZeroBidsNotAllowed();
	error BidHigherThanAskingPriceAborting();
	error ListingHasAlreadyEndedUnableToProcessPurchaseAborting();
	error ListingIsAlreadySettledAborting();
	error AuctionIsAlreadySettledAborting();
	error ListingCanOnlyBeAcceptedBySellerAborting();
	error AuctionCantBeCancelledOnlyBySellerOrAdminAborting();
	error InvalidAuctionPage();
	error NewListingsPaused();
	error UnauthorizedNFT();

	function onERC1155Received(
		address,
		address,
		uint,
		uint,
		bytes memory
	) public virtual returns (bytes4) {
		return this.onERC1155Received.selector;
	}

	function onERC1155BatchReceived(
		address,
		address,
		uint[] memory,
		uint[] memory,
		bytes memory
	) public virtual returns (bytes4) {
		return this.onERC1155BatchReceived.selector;
	}

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize(
		address _erc20Address,
		uint fee,
		uint cancellationFee,
		address feeRecipient
	) public initializer {
		__Pausable_init();
		__AccessControl_init();
		__UUPSUpgradeable_init();
		__ReentrancyGuard_init();

		_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
		_grantRole(PAUSER_ROLE, msg.sender);
		_grantRole(UPGRADER_ROLE, msg.sender);
		_grantRole(STORE_ADMIN_ROLE, msg.sender);

		if (feeRecipient == address(0)) revert InvalidRecipientAddress();
		if (_erc20Address == address(0)) revert InvalidTokenAddress();
		if (fee >= _auctionFeeDenominator) revert InvalidAuctionFee();
		if (cancellationFee >= _auctionFeeDenominator)
			revert InvalidCancellationFee();

		auctionFee = fee;
		auctionFeeRecipient = feeRecipient;
		auctionCancellationFee = cancellationFee;
		erc20Address = _erc20Address;
		minAuctionDuration = 300; // 5 minutes
		maxAuctionDuration = 432_000; // default 5 days
		listingOpen = true;
	}

	function getOpenAuctions()
		public
		view
		virtual
		returns (bytes32[] memory auctions)
	{
		auctions = _openAuctions;
	}

	function getOpenAuctionsPg(
		uint _page,
		uint _size
	) public view virtual returns (bytes32[] memory) {
		if (_page == 0) revert InvalidAuctionPage();
		uint _auctionsIndex;
		unchecked {
			_auctionsIndex = _size * _page - _size;
		}
		bool isIndexContained;
		unchecked {
			isIndexContained = _auctionsIndex > _openAuctions.length - 1;
		}
		if (_openAuctions.length == 0 || isIndexContained) {
			bytes32[] memory empty;
			return empty;
		}

		uint arraySize = _size;
		bool isSizeContained;

		isSizeContained = _size > _openAuctions.length - _auctionsIndex;
		if (isSizeContained) {
			unchecked {
				arraySize = _openAuctions.length - _auctionsIndex;
			}
		}

		bytes32[] memory openAuctions = new bytes32[](arraySize);
		uint _returnCounter = 0;
		unchecked {
			for (; _auctionsIndex < _size * _page; ) {
				if (_auctionsIndex < _openAuctions.length - 1) {
					openAuctions[_returnCounter] = _openAuctions[
						_returnCounter + _auctionsIndex
					];
				} else {
					break;
				}
				_returnCounter++;
			}
		}
		return openAuctions;
	}

	function getAuction(
		bytes32 id
	) public view virtual returns (Auction memory) {
		return _auctions[id];
	}

	function getAuctions(
		bytes32[] memory ids
	) public view returns (Auction[] memory auctions) {
		uint elementNumber = ids.length;
		auctions = new Auction[](elementNumber);
		for (uint i = 0; i < elementNumber; ) {
			auctions[i] = _auctions[ids[i]];
			unchecked {
				i++;
			}
		}
	}

	/**
	 * Admin Functions
	 **/
	function pause() external onlyRole(PAUSER_ROLE) {
		_pause();
	}

	function unpause() external onlyRole(PAUSER_ROLE) {
		_unpause();
	}

	function setAuctionFee(uint fee) public virtual onlyRole(STORE_ADMIN_ROLE) {
		if (fee >= _auctionFeeDenominator) revert InvalidAuctionFee();
		auctionFee = fee;
		emit AuctionFeeChanged(fee);
	}

	/**
	 *	This is a value in tokens that users need to pay
	 *	to cancel an auction that has no bidders.
	 **/

	function setCancellationFee(uint fee) external onlyRole(STORE_ADMIN_ROLE) {
		if (fee >= _auctionFeeDenominator) revert InvalidAuctionFee();
		auctionCancellationFee = fee;
		emit CancellationFeeChanged(fee);
	}

	function addNFT(address _nft) external onlyRole(STORE_ADMIN_ROLE) {
		_allowedNfts[_nft] = true;
		emit AddedNft(_nft);
	}

	function removeNFT(address _nft) external onlyRole(STORE_ADMIN_ROLE) {
		delete _allowedNfts[_nft];
		emit RemovedNft(_nft);
	}

	function pauseListings() external onlyRole(PAUSER_ROLE) {
		listingOpen = false;
		emit ListingsPaused();
	}

	function resumeListings() external onlyRole(PAUSER_ROLE) {
		listingOpen = true;
		emit ListingsResumed();
	}

	function setAuctionFeeRecipient(
		address recipient
	) external onlyRole(TREASURY_ROLE) {
		if (recipient == address(0)) revert InvalidRecipientAddress();
		auctionFeeRecipient = recipient;
		emit TreasuryChanged(recipient);
	}

	function setListingDuration(
		uint min,
		uint max
	) external onlyRole(STORE_ADMIN_ROLE) {
		if (min > max) revert InvalidDurationRestrictions(); // greater costs less, 1 OPCODE
		minAuctionDuration = min;
		maxAuctionDuration = max;
		emit DurationChanged(min, max);
	}

	function massCancelAuctions(
		bytes32[] memory _ids
	) external nonReentrant onlyRole(STORE_ADMIN_ROLE) {
		for (uint i = 0; i < _ids.length; i++) {
			cancelAuctionAdmin(_ids[i]);
		}
	}

	function cancelAllAuctions()
		external
		nonReentrant
		onlyRole(STORE_ADMIN_ROLE)
	{
		uint _openAuctionCount = _openAuctions.length;
		if (_openAuctionCount <= 0) revert NoOpenAuctions();
		bytes32 _auctionId;
		for (uint i = _openAuctionCount; i > 0; ) {
			_auctionId = _openAuctions[i - 1];
			cancelAuctionAdmin(_auctionId);
			unchecked {
				i = i - 1;
			}
		}
	}

	/**
	 * Internal Functions
	 **/

	/**
	 * Check if the seller is the owner of the token.
	 * We expect that the owner of the tokens approves the spending before he launch the auction
	 * The function escrows the tokens to sell
	 **/
	function _escrowTokensToSell(
		bool isErc721,
		address nftAddress,
		address seller,
		uint tokenId,
		uint amount
	) internal {
		if (!isErc721) {
			if (amount <= 0) revert InvalidTokenAmount();
			IERC1155Upgradeable(nftAddress).safeTransferFrom(
				seller,
				address(this),
				tokenId,
				amount,
				""
			);
		} else {
			IERC721Upgradeable(nftAddress).transferFrom(
				seller,
				address(this),
				tokenId
			);
		}
	}

	/**
	 * Transfer NFT from the contract to the recipient
	 */
	function _transferNFT(
		bool isErc721,
		address nftAddress,
		address recipient,
		uint tokenId,
		uint amount
	) internal {
		if (!isErc721) {
			IERC1155Upgradeable(nftAddress).safeTransferFrom(
				address(this),
				recipient,
				tokenId,
				amount,
				""
			);
		} else {
			IERC721Upgradeable(nftAddress).transferFrom(
				address(this),
				recipient,
				tokenId
			);
		}
	}

	function _transferAssets(
		uint amount,
		address recipient,
		bool settleOrReturnFee
	) internal {
		uint fee = amount * auctionFee;
		unchecked {
			fee = fee / _auctionFeeDenominator;
		}
		if (settleOrReturnFee) {
			IERC20Upgradeable(erc20Address).safeTransfer(
				recipient,
				amount - fee
			);
			IERC20Upgradeable(erc20Address).safeTransfer(
				auctionFeeRecipient,
				fee
			);
		} else {
			IERC20Upgradeable(erc20Address).safeTransfer(recipient, amount);
		}
	}

	/**
	 * Public Functions
	 **/

	function createSale(
		bool isErc721,
		address nftAddress,
		uint tokenId,
		uint amount,
		uint endedAt,
		uint _askingPrice
	) public whenNotPaused canList {
		if (_askingPrice <= 0) revert InitialAskingPriceMustBeNonZero();
		if ((isErc721 && amount != 1) || (!isErc721 && amount <= 0))
			revert InvalidTokenAmount();
		bytes32 id = keccak256(
			abi.encode(msg.sender, nftAddress, tokenId, amount, block.timestamp)
		);
		if (_auctions[id].startedAt != 0)
			revert AuctionAlreadyExistedRorCurrentAuctionId();
		if (!_allowedNfts[nftAddress]) revert UnauthorizedNFT();
		if (
			endedAt <= block.timestamp + minAuctionDuration ||
			endedAt >= block.timestamp + maxAuctionDuration
		) revert InvalidAuctionDuration();

		_escrowTokensToSell(isErc721, nftAddress, msg.sender, tokenId, amount);

		unchecked {
			_auctionCount++;
		}

		Auction memory auction = Auction({
			seller: msg.sender,
			nftAddress: nftAddress,
			tokenId: tokenId,
			isErc721: isErc721,
			endedAt: endedAt,
			startedAt: block.timestamp,
			amount: amount,
			bidder: address(0),
			askingPrice: _askingPrice,
			highestBid: 0
		});

		_auctions[id] = auction;
		_openAuctions.push(id);
		emit AuctionCreated(
			isErc721,
			nftAddress,
			tokenId,
			id,
			amount,
			endedAt,
			_askingPrice
		);
	}

	function batchCreateSale(
    bool[] calldata isErc721s,
    address[] calldata nftAddresses,
    uint[] calldata tokenIds,
    uint[] calldata amounts,
    uint[] calldata endedAts,
    uint[] calldata askingPrices
	) external whenNotPaused canList {
		require(isErc721s.length == nftAddresses.length, "Mismatched arrays");
		for (uint i = 0; i < isErc721s.length; i++) {
			createSale(
				isErc721s[i], 
				nftAddresses[i], 
				tokenIds[i], 
				amounts[i], 
				endedAts[i], 
				askingPrices[i]
			);
		}
	}


	function createDutchSale(
    bool isErc721,
    address nftAddress,
    uint tokenId,
    uint amount,
    uint endedAt,
    uint _startPrice,
    uint _endPrice
		) public whenNotPaused canList {
		require(_startPrice > _endPrice, "Start price must be greater than end price");
		require(_endPrice > 0, "End price must be greater than zero");
		
		bytes32 id = keccak256(abi.encode(msg.sender, nftAddress, tokenId, amount, block.timestamp));

		if (_dutchAuctions[id].endedAt != 0) revert AuctionAlreadyExistedRorCurrentAuctionId();
		if (!_allowedNfts[nftAddress]) revert UnauthorizedNFT();
		if (endedAt <= block.timestamp + minAuctionDuration || endedAt >= block.timestamp + maxAuctionDuration) {
			revert InvalidAuctionDuration();
		}

		_escrowTokensToSell(isErc721, nftAddress, msg.sender, tokenId, amount);

		_dutchAuctions[id] = DutchAuction({
			seller: msg.sender,
			nftAddress: nftAddress,
			isErc721: isErc721,
			tokenId: tokenId,
			endedAt: endedAt,
			startedAt: block.timestamp,
			amount: amount,
			startPrice: _startPrice,
			endPrice: _endPrice,
			isSettled: false
		});

		_openAuctions.push(id);

		emit AuctionCreated(isErc721, nftAddress, tokenId, id, amount, endedAt, _startPrice);
	}




	function bid(
		bytes32 id,
		uint bidValue
	) external whenNotPaused nonReentrant {
		Auction memory auction = _auctions[id];
		if (auction.endedAt <= block.timestamp)
			revert AuctionHasAlreadyEndedUnableToProcessBidAborting();
		if (bidValue <= 0) revert ZeroBidsNotAllowed();
		uint _auctionBase = auction.highestBid == 0
			? auction.askingPrice
			: auction.highestBid;
		uint _bidIncrementMinimum = (_auctionBase *
			_auctionMinimumBidIncrement) / _auctionFeeDenominator;
		if (bidValue < auction.highestBid + _bidIncrementMinimum)
			revert BidIsSmallerThanRequiredIncrementAborting(); // need to change test file; can you make same size bid? assume no, corected logic

		if (auction.askingPrice <= bidValue)
			revert BidHigherThanAskingPriceAborting();

		_auctions[id].highestBid = bidValue;
		_auctions[id].bidder = msg.sender;

		if (auction.bidder != address(0) && auction.highestBid != 0) {
			_transferAssets(auction.highestBid, auction.bidder, false);
		}

		IERC20Upgradeable(erc20Address).safeTransferFrom(
			msg.sender,
			address(this),
			bidValue
		);

		emit AuctionBid(msg.sender, bidValue, id);
	}

	function bidDutch(bytes32 id) external payable whenNotPaused nonReentrant {
    DutchAuction storage auction = _dutchAuctions[id];
		require(auction.endedAt > block.timestamp, "Auction has ended");

		uint currentPrice = getCurrentDutchAuctionPrice(id);
		require(msg.value >= currentPrice, "Bid must be at least the current price");

		auction.isSettled = true;

		_transferAssets(msg.value, auction.seller, true);
		_transferNFT(auction.isErc721, auction.nftAddress, msg.sender, auction.tokenId, auction.amount);

		emit AuctionSettled(id);
	}

	function getCurrentDutchAuctionPrice(bytes32 id) public view returns (uint) {
		DutchAuction memory auction = _dutchAuctions[id];
		if (block.timestamp >= auction.endedAt) {
			return auction.endPrice;
		}

		uint elapsed = block.timestamp - auction.startedAt;
		uint totalDuration = auction.endedAt - auction.startedAt;
		uint priceDiff = auction.startPrice - auction.endPrice;
		uint priceDecrement = (priceDiff * elapsed) / totalDuration;

		return auction.startPrice - priceDecrement;
	}

	function buy(bytes32 id) external whenNotPaused nonReentrant {
		Auction memory auction = _auctions[id];
		if (auction.endedAt <= block.timestamp)
			revert ListingHasAlreadyEndedUnableToProcessPurchaseAborting();
		// pay for the asset/s
		IERC20Upgradeable(erc20Address).safeTransferFrom(
			msg.sender,
			address(this),
			auction.askingPrice
		);

		// save price
		_auctions[id].highestBid = auction.askingPrice;
		_auctions[id].bidder = msg.sender;

		// return offer to previous bidder if any
		if (auction.highestBid > 0)
			_transferAssets(auction.highestBid, auction.bidder, false);

		settleAuction(id);
	}

	function acceptOffer(bytes32 id) external whenNotPaused nonReentrant {
		Auction memory auction = _auctions[id];
		if (auction.seller == address(0))
			revert ListingIsAlreadySettledAborting(); // double check error message
		if (auction.seller != msg.sender)
			revert ListingCanOnlyBeAcceptedBySellerAborting();
		settleAuction(id);
	}

	/**
	 * Settle the already ended auction -
	 */
	function settleAuction(bytes32 id) internal {
		Auction memory auction = _auctions[id];

		bool isErc721 = auction.isErc721;
		address nftAddress = auction.nftAddress;
		uint amount = auction.amount;
		uint tokenId = auction.tokenId;
		uint highestBid = auction.highestBid;
		address bidder = auction.bidder;

		if (bidder == address(0)) {
			_transferNFT(isErc721, nftAddress, auction.seller, tokenId, amount);
		} else {
			_transferNFT(isErc721, nftAddress, bidder, tokenId, amount);
		}

		if (bidder != address(0) && highestBid != 0) {
			_transferAssets(highestBid, auction.seller, true);
		}

		_toRemove(id);
		unchecked {
			_auctionCount--;
		}
		emit AuctionSettled(id);
	}

	function _toRemove(bytes32 id) internal {
		uint _auctionLength = _openAuctions.length;
		for (uint x = 0; x < _auctionLength; ) {
			if (_openAuctions[x] == id) {
				if (x != _auctionLength - 1) {
					unchecked {
						_openAuctions[x] = _openAuctions[_auctionLength - 1];
					}
				}
				_openAuctions.pop();
				break;
			}
			unchecked {
				x++;
			}
		}
		delete _auctions[id];
	}

	function cancelAuction(bytes32 id) public virtual nonReentrant {
		Auction memory auction = _auctions[id];
		if (auction.seller == address(0))
			revert AuctionIsAlreadySettledAborting();
		if (auction.seller != msg.sender)
			revert AuctionCantBeCancelledOnlyBySellerOrAdminAborting();

		bool isErc721 = auction.isErc721;
		address nftAddress = auction.nftAddress;
		uint amount = auction.amount;
		uint tokenId = auction.tokenId;
		uint highestBid = auction.highestBid;
		address bidder = auction.bidder;
		uint penalty = (auction.askingPrice * auctionCancellationFee) /
			_auctionFeeDenominator;

		IERC20Upgradeable(erc20Address).safeTransferFrom(
			msg.sender,
			address(this),
			penalty
		);

		_transferNFT(isErc721, nftAddress, auction.seller, tokenId, amount);

		if (bidder != address(0) && highestBid != 0) {
			_transferAssets(highestBid, bidder, false);
		}
		unchecked {
			_auctionCount--;
		}
		_toRemove(id);
		emit AuctionCancelled(id);
	}

	function cancelAuctionAdmin(bytes32 id) internal {
		Auction memory auction = _auctions[id];
		if (auction.seller == address(0))
			revert AuctionIsAlreadySettledAborting();
		bool isErc721 = auction.isErc721;
		address nftAddress = auction.nftAddress;
		uint amount = auction.amount;
		uint tokenId = auction.tokenId;
		uint highestBid = auction.highestBid;
		address bidder = auction.bidder;

		// Admin can cancel without penalty

		_transferNFT(isErc721, nftAddress, auction.seller, tokenId, amount);

		if (bidder != address(0) && highestBid != 0) {
			_transferAssets(highestBid, bidder, false);
		}
		unchecked {
			_auctionCount--;
		}
		_toRemove(id);
		emit AuctionCancelled(id);
	}

	function _authorizeUpgrade(
		address newImplementation
	) internal override onlyRole(UPGRADER_ROLE) {}
}
