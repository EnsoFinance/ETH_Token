import console from 'console'
import { providers } from 'ethers'
import hre from 'hardhat'

const enso_multisig = '0xEE0e85c384F7370FF3eb551E92A71A4AFc1B259F' //ENSO Treasury

async function main() {
    const Enso = await hre.ethers.getContractFactory('Enso')
    const currentB = await (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp
    const allowedAfter = currentB + 63113852

    const enso = await Enso.deploy(
        "Enso",
        "ENSO",
        enso_multisig,
        allowedAfter
    )

    let balance = await enso.balanceOf(enso_multisig)
    let mint = await enso.mintingAllowedAfter()
    console.log('balance multisig: ', balance)
    console.log('name: ', await enso.name())
    console.log('symbol: ', await enso.symbol())
    console.log('minting after: ', mint)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })