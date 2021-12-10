/***
 *                               ______     __   __     ______     ______                                  
 *                              /\  ___\   /\ "-.\ \   /\  ___\   /\  __ \                                 
 *                              \ \  __\   \ \ \-.  \  \ \___  \  \ \ \/\ \                                
 *                               \ \_____\  \ \_\\"\_\  \/\_____\  \ \_____\                               
 *                                \/_____/   \/_/ \/_/   \/_____/   \/_____/                               
 *                                                                                                         
 */

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";


contract Enso is ERC20VotesComp {

    /// @notice Address which may mint new tokens
    address public minter;

    /// @notice The timestamp after which minting may occur
    uint public mintingAllowedAfter;

    /// @notice Minimum time between mints
    uint32 public constant minimumTimeBetweenMints = 1 days * 365;

    /// @notice Cap on the percentage of totalSupply that can be minted at each mint
    uint8 public mintCap = 2;
    
    /// @notice Tracking if mintcap has been updated once
    bool public mintCapUpdated;

    /// @notice An event thats emitted when the minter address is changed
    event MinterChanged(address minter, address newMinter);

    constructor(
        string memory name_, 
        string memory symbol_, 
        address _minter,
        uint256 _mintingAllowedAfter
    )
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        require(_mintingAllowedAfter >= block.timestamp,"Enso: minting can only begin after deployment");
        mintingAllowedAfter = _mintingAllowedAfter;
        
        minter = _minter;
        _mint(_minter, 100_000_000e18); // 100 million Enso
    }

    /**
     * @notice Change the minter address
     * @param _minter The address of the new minter
     */
    function updateMinter(address _minter) external {
        require(msg.sender == minter, "Enso#setMinter: only the minter can change the minter address");
        emit MinterChanged(minter, _minter);
        minter = _minter; 
    }

    /**
     * @notice Mint new tokens
     * @param _account The address of the destination account
     * @param _amount The number of tokens to be minted
     */
    function mint(address _account, uint256 _amount) external {
        require(_amount > 0, "Enso#mint: should be greater than 0");
        require(msg.sender == minter, "Enso#mint: only the minter can mint");
        require(block.timestamp >= mintingAllowedAfter, "Enso#mint: minting not allowed yet");
        require(_amount <=  mintCap * totalSupply() / 100, "Enso#mint: exceeded mint cap");
        
        mintingAllowedAfter = block.timestamp + minimumTimeBetweenMints;
        _mint(_account, _amount);
    }

    /**
     * @notice Change mintCap property to immutable, can be called once
     * @param _mintCap final minCap
     */
    function updateMintCap(uint8 _mintCap) external {
        require(msg.sender == minter, "Enso#updateMintCap: only the minter can change mintCap");
        require(!mintCapUpdated, "Enso#updateMintCap: minCap is immutable");

        mintCapUpdated = true;
        mintCap = _mintCap;
    }

    /**
     * @notice Burn tokens
     * @param _amount The number of tokens to be burned
     */
    function burn(uint256 _amount) public virtual {
        _burn(_msgSender(), _amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address _account, uint256 _amount) public virtual {
        uint256 currentAllowance = allowance(_account, _msgSender());
        require(currentAllowance >= _amount, "Enso#burnFrom: burn amount exceeds allowance");
        unchecked {
            _approve(_account, _msgSender(), currentAllowance - _amount);
        }
        _burn(_account, _amount);
    }
}                                 