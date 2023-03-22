# Solidity API

## STARLNftStaking

A contract for nft staking in the starlink ecosystem

### NFTStakingAdded

```solidity
event NFTStakingAdded(address _nftAddress, uint256 _startTime, uint256 _endTime, uint256[] _rates)
```

event emitted when new NFT staking is added

### NFTStakingTierUpdated

```solidity
event NFTStakingTierUpdated(address _nftAddress, uint8 _tier)
```

event emitted when staking tier updated

### NFTStaked

```solidity
event NFTStaked(address _account, address _nftAddress, uint256[] _tokenIds)
```

event emitted when nft staked

### NFTUnstaked

```solidity
event NFTUnstaked(address _account, address _nftAddress, uint256[] _tokenIds)
```

event emitted when nft unstaked

### RewardClaimed

```solidity
event RewardClaimed(address _account, address _nftAddress, uint256[] _tokenIds, uint256 _reward)
```

event emitted when reward claimed

### erc20Address

```solidity
address erc20Address
```

### rates

```solidity
mapping(address => uint256[]) rates
```

### startTimes

```solidity
mapping(address => uint256) startTimes
```

### endTimes

```solidity
mapping(address => uint256) endTimes
```

### tiers

```solidity
mapping(address => mapping(uint256 => uint8)) tiers
```

### deposits

```solidity
mapping(address => mapping(address => struct EnumerableSet.UintSet)) deposits
```

### depositTimes

```solidity
mapping(address => mapping(address => mapping(uint256 => uint256))) depositTimes
```

### constructor

```solidity
constructor(address _erc20Address) public
```

### pause

```solidity
function pause() public
```

### unpause

```solidity
function unpause() public
```

### stakingStarted

```solidity
modifier stakingStarted(address _nftAddress)
```

### addNftStaking

```solidity
function addNftStaking(address _nftAddress, uint256 _startTime, uint256 _endTime, uint256[] _rates) public
```

### setTiers

```solidity
function setTiers(address _nftAddress, uint256[] _tokenIds, uint8 _tier) public
```

### calculateReward

```solidity
function calculateReward(address _nftAddress, address _account, uint256 _tokenId) public view returns (uint256)
```

### claimRewards

```solidity
function claimRewards(address _nftAddress, uint256[] _tokenIds) public
```

### stake

```solidity
function stake(address _nftAddress, uint256[] _tokenIds) external
```

### unstake

```solidity
function unstake(address _nftAddress, uint256[] _tokenIds) external
```

### withdrawTokens

```solidity
function withdrawTokens() external
```

### onERC721Received

```solidity
function onERC721Received(address, address, uint256, bytes) external pure returns (bytes4)
```

## AmoebaXStarl

A contract for amoebas in the STARL ecosystem

### ArtistAdded

```solidity
event ArtistAdded(uint256 artistId, uint256 supply, uint256 startId, uint256 launchTime, address feeRecipient, string baseUrl, string extension)
```

### FeePercentUpdated

```solidity
event FeePercentUpdated(uint256 devFeePercent, uint256 artistFeePercent)
```

### cost

```solidity
uint256 cost
```

### ArtistInfo

```solidity
struct ArtistInfo {
  uint256 supply;
  uint256 minted;
  uint256 startId;
  uint256 launchTime;
  address feeRecipient;
  string baseUrl;
  string extension;
}
```

### devFeePercent

```solidity
uint256 devFeePercent
```

### artistFeePercent

```solidity
uint256 artistFeePercent
```

### devFeeRecipient

```solidity
address devFeeRecipient
```

### amoebaRecipient

```solidity
address amoebaRecipient
```

### artistIdPointer

```solidity
uint256 artistIdPointer
```

### artists

```solidity
mapping(uint256 => struct AmoebaXStarl.ArtistInfo) artists
```

### constructor

```solidity
constructor(address _devFeeRecipient, address _amoebaRecipient, uint256[] supplies, uint256 launchTime, address[] feeRecipients, string[] baseUrls, string extension) public
```

### updateFeePercent

```solidity
function updateFeePercent(uint256 _devFeePercent, uint256 _artistFeePercent) public
```

### addArtist

```solidity
function addArtist(uint256 supply, uint256 launchTime, address feeRecipient, string baseUrl, string extension) public
```

### batchAddArtists

```solidity
function batchAddArtists(uint256[] supplies, uint256 launchTime, address[] feeRecipients, string[] baseUrls, string[] extensions) public
```

### _addArtist

```solidity
function _addArtist(string baseUrl, uint256 supply, uint256 launchTime, address feeRecipient, string extension) internal
```

### mint

```solidity
function mint(address _to, uint256 artistId) public payable
```

### _getArtistId

```solidity
function _getArtistId(uint256 tokenId) internal view returns (uint256)
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

_See {IERC721Metadata-tokenURI}._

### withdraw

```solidity
function withdraw() public
```

## StarlPAL

A contract for PAL(Physics Altering Lifeforms) in the STARL ecosystem

### Revealed

```solidity
event Revealed(string _revealedURI)
```

event emitted when all tokens are revealed

### Unrevealed

```solidity
event Unrevealed()
```

event emitted when all tokens are unrevealed, this is for testing purpose

### BaseURIUpdated

```solidity
event BaseURIUpdated(string _newBaseURI)
```

event emitted when base token uri is updated

### ExtensionUpdated

```solidity
event ExtensionUpdated(string _newExtension)
```

event emitted when extension is updated

### cost

```solidity
uint256 cost
```

ether price of a PAL nft, initialized as 0.08 ether.

### maxSupply

```solidity
uint256 maxSupply
```

max supply of PAL nfts, initialized as 10k.

### maxMintAmount

```solidity
uint256 maxMintAmount
```

max mint amount per wallet and transaction, initialized as 30.

### revealedURI

```solidity
string revealedURI
```

revealed uri - token base uri after reveal, initialized as empty.

### extension

```solidity
string extension
```

extension - token uri extension after reveal, initialized as empty.

### pendingURI

```solidity
string pendingURI
```

pending uri - token uri which is used before revealed, need to be initialized via constructor.

### isRevealed

```solidity
bool isRevealed
```

flag if revealed or not

### addressCanMint

```solidity
mapping(address => uint256) addressCanMint
```

left amount of nfts for the address, will be reduced from maxMintAmount once a user mint some nfts.

### addressHasTokens

```solidity
mapping(address => bool) addressHasTokens
```

flag if the address has PAL nfts.

### mintStartTime

```solidity
uint256 mintStartTime
```

the start timestamp of minting, need to be initialized via constructor.

### constructor

```solidity
constructor(string _pendingURI, uint256 _mintStartTime) public
```

contract constructor

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pendingURI | string | token metadata uri that is used before it's revealed. |
| _mintStartTime | uint256 | the timestamp when users can mint PAL nfts. |

### mint

```solidity
function mint(address _to, uint256 _mintAmount) public payable
```

mint _mintAmount of PALs to _to address by sending correct amount of ether. needed ether price is 0.08 * _mintAmount.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | the target address where minted nft is transferred. each address can mint upto 30 nfts. |
| _mintAmount | uint256 | the amount of nft to mint. it should be less than 30. |

### setMintStartTime

```solidity
function setMintStartTime(uint256 _mintStartTime) public
```

update mint start timestamp

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mintStartTime | uint256 | new value to set for start timestamp. |

### reveal

```solidity
function reveal(string _revealedURI) public
```

After 10k PALs are minted, owner should call this reveal function to reveal token uris.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _revealedURI | string | token metadata base url. |

### unReveal

```solidity
function unReveal() public
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

Return token uri for a token

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | token id |

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

_Base URI for computing {tokenURI}. If set, the resulting URI for each
token will be the concatenation of the `baseURI` and the `tokenId`. Empty
by default, can be overridden in child contracts._

### setBaseURI

```solidity
function setBaseURI(string _newBaseURI) public
```

Update token base uri, set revealedURI if revealed, otherwise set pending uri.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newBaseURI | string | base token metadata uri |

### setExtension

```solidity
function setExtension(string _extension) public
```

Update token uri extension, a token uri is composed of base uri or revealed uri appending token id and appending extension.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _extension | string | extension string to set, e.g. ".json" |

### removeExtension

```solidity
function removeExtension() public
```

remove extension, if remove extension a token uri will be composed by only base uri and token id.

### withdraw

```solidity
function withdraw() public
```

withdraw all ether balance of this contract to contract owner.

## StarlPixelnauts

A contract for pixelnauts in the starlink ecosystem

### Revealed

```solidity
event Revealed(string _revealedURI)
```

event emitted when all tokens are revealed

### Unrevealed

```solidity
event Unrevealed()
```

event emitted when all tokens are unrevealed, this is for testing purpose

### BaseURIUpdated

```solidity
event BaseURIUpdated(string _newBaseURI)
```

event emitted when base token uri is updated

### ExtensionUpdated

```solidity
event ExtensionUpdated(string _newExtension)
```

event emitted when extension is updated

### cost

```solidity
uint256 cost
```

### maxSupply

```solidity
uint256 maxSupply
```

### maxMintAmount

```solidity
uint256 maxMintAmount
```

### revealedURI

```solidity
string revealedURI
```

### extension

```solidity
string extension
```

### pendingURI

```solidity
string pendingURI
```

### isRevealed

```solidity
bool isRevealed
```

### addressCanMint

```solidity
mapping(address => uint256) addressCanMint
```

### addressHasTokens

```solidity
mapping(address => bool) addressHasTokens
```

### mintStartTime

```solidity
uint256 mintStartTime
```

### constructor

```solidity
constructor(string _pendingURI, uint256 _mintStartTime) public
```

### mint

```solidity
function mint(address _to, uint256 _mintAmount) public payable
```

### setMintStartTime

```solidity
function setMintStartTime(uint256 _mintStartTime) public
```

### reveal

```solidity
function reveal(string _revealedURI) public
```

### unReveal

```solidity
function unReveal() public
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

_See {IERC721Metadata-tokenURI}._

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

_Base URI for computing {tokenURI}. If set, the resulting URI for each
token will be the concatenation of the `baseURI` and the `tokenId`. Empty
by default, can be overridden in child contracts._

### setBaseURI

```solidity
function setBaseURI(string _newBaseURI) public
```

### setExtension

```solidity
function setExtension(string _extension) public
```

### removeExtension

```solidity
function removeExtension() public
```

### withdraw

```solidity
function withdraw() public
```

