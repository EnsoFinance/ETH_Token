import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, ContractFactory, Signer } from "ethers";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('vesting', () => {
    let accounts: SignerWithAddress[],
        Enso: ContractFactory,
        token: Contract,
        treasury: SignerWithAddress,
        newMinter: SignerWithAddress,
        attacker: SignerWithAddress,
        vesters: any,
        start: BigNumber,
        end: BigNumber,
        total: BigNumber,
        each: BigNumber,
        supply: BigNumber,
        burn: BigNumber,
        approve: BigNumber,
        balanceAfter: BigNumber,
        max: BigNumber,
        rewardSecond : BigNumber,
        duration: BigNumber

    before(async () => {
        accounts = await ethers.getSigners()
        treasury = accounts[0]
        newMinter = accounts[1]
        attacker = accounts[10]

        supply = BigNumber.from("100000000000000000000000000")
        max = BigNumber.from("2000000000000000000000000")
        burn = supply.div(2)
        approve = burn.div(2)
        balanceAfter = supply.sub(burn.add(approve))

        Enso = await ethers.getContractFactory("Enso");
    });

    const initialize = async (name:string, tests:any) => {
        describe(name, () => {
            before(async () => {
                start = await getTime()
                duration = BigNumber.from(1000)
                end = start.add(duration)
                token = await Enso.deploy('Enso', 'ENSO', treasury.address, end)
            });
            tests();
        });
    }
 
    initialize('initialized', () => {
        it('minter', async () => {
            expect(await token.minter()).to.equal(treasury.address)
        });
        it('name', async () => {
            expect(await token.name()).to.equal('Enso')
        });
        it('symbol', async () => {
            expect(await token.symbol()).to.equal('ENSO')
        });
        it('minting allowed after', async () => {
            expect(await token.mintingAllowedAfter()).to.equal(end)
        });
        describe('mint successful', () => {
            it('balance treasury', async () => {
                expect(await token.balanceOf(treasury.address)).to.equal(supply)
            });
            it('total supply', async () => {
                expect(await token.totalSupply()).to.equal(supply)
            });
            describe('burn', async () => {

                before(async () => {
                    await token.burn(burn)
                });
                it('supply updated', async () => {
                    expect(await token.totalSupply()).to.equal(burn)
                });
                it('balance updated', async () => {
                    expect(await token.balanceOf(treasury.address)).to.equal(burn)
                });
                describe('approve burn from', () => {
                    before(async () => {
                        await token.approve(newMinter.address, approve)
                    });
                    it('allowance updated', async () => {
                        expect(await token.allowance(treasury.address, newMinter.address)).to.equal(approve)
                    });
                    describe('burn from', () => {
                        describe('non-functional', () => {
                            it('revert greater than allowance', async () => {
                                await expect(token.connect(newMinter).burnFrom(treasury.address, approve.mul(2)))
                                .to.be.revertedWith('Enso#burnFrom: burn amount exceeds allowance')
                            });
                        });
                        describe('functional', () => {
                            before(async () => {
                                await token.connect(newMinter).burnFrom(treasury.address, approve)
                            });
                            it('supply updated', async () => {
                                expect(await token.totalSupply()).to.equal(balanceAfter)
                            });
                            it('balance updated', async () => {
                                expect(await token.balanceOf(treasury.address)).to.equal(balanceAfter)
                            });
                            it('allowance updated', async () => {
                                expect(await token.allowance(treasury.address, newMinter.address)).to.equal(0)
                            });
                        });
                    });
                });

            });
        });
    })
    describe('single calls', () => {
        initialize('updateMinter', () => {
            before(async () => {
                await token.updateMinter(newMinter.address)
            });
            it('new minter set', async () => {
                expect(await token.minter()).to.equal(newMinter.address)
            });
        });
        initialize('updateMintCap', () => {
            let mintCap = BigNumber.from("10");
            before(async () => {
                await token.updateMintCap(mintCap)
            });
            it('new mintcap set', async () => {
                expect(await token.mintCap()).to.equal(mintCap)
            });
            it('mint cap updated', async () => {
                expect(await token.mintCapUpdated ()).to.equal(true)
            });
            describe('non-functional', () => {
                it('revert when not minter', async () => {
                    await expect(token.connect(attacker).updateMintCap(mintCap))
                    .to.be.revertedWith('Enso#updateMintCap: only the minter can change mintCap')
                });
                it('revert when already updated', async () => {
                    await expect(token.updateMintCap(mintCap))
                    .to.be.revertedWith('Enso#updateMintCap: mintCap is immutable')
                });
            });
        })
        initialize('mint', () => {
            describe('non-functional', () => {
                it('revert not from attacker', async () => {
                    await expect(token.connect(attacker).mint(attacker.address, supply))
                    .to.be.revertedWith('Enso#mint: only the minter can mint')
                });
                it('revert before allowance time', async () => {
                    await expect(token.mint(newMinter.address, supply))
                    .to.be.revertedWith('Enso#mint: minting not allowed yet')
                });
                it('revert when not greater than 0', async () => {
                    await expect(token.mint(newMinter.address, 0))
                    .to.be.revertedWith('Enso#mint: should be greater than 0')
                });
                it('time travel', async () => {
                    before(async () => {
                        await increaseTime(Number(end))
                    });
                    it('revert when greater than mintcap', async () => {
                        await expect(token.mint(newMinter.address, supply))
                        .to.be.revertedWith('Enso#mint: exceeded mint cap')
                    });
                });
            });
            describe('functional', () => {
                let time: BigNumber;
                before(async () => {
                    time = await getTime()
                    await increaseTime(Number(duration))
                    await token.mint(newMinter.address, max)
                });
                it('supply updated', async () => {
                    expect(await token.totalSupply()).to.equal(supply.add(max))
                });
                it('balance updated', async () => {
                    expect(await token.balanceOf(newMinter.address)).to.equal(max)
                });
                it('minting allowed after updated', async () => {
                    console.log(time.add(await token.minimumTimeBetweenMints()))
                    console.log(await token.mintingAllowedAfter())
                });
            });
        })
    })
    const increaseTime = async (seconds: Number) => {
        await ethers.provider.send("evm_increaseTime", [seconds])
        await ethers.provider.send("evm_mine", [])
    }

    const getTime = async () => {
        let block = await ethers.provider.getBlock(
            await ethers.provider.getBlockNumber()
            )
        return ethers.BigNumber.from(block.timestamp)
    }
})
