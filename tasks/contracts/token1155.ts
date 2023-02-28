import { ethers } from 'hardhat'
import { task } from 'hardhat/config'
import { getWalletAddress, getNonce, readDeploymentsFile } from '../utils'

task('Token1155:mint', 'mint tokens for user')
  .addParam('address', 'address to mint to')
  .addParam('amount', 'amount to mint')
  .setAction(async (args, hre) => {
    if (process.env.PRIVATE_KEY == undefined) {
      return
    }
    const accountAddress = await getWalletAddress(hre, process.env.PRIVATE_KEY)
    let nonce = await getNonce(hre, accountAddress)

    const tokenA = await readDeploymentsFile('Token1155', hre.network.config.chainId)

    const tokenAContract = await ethers.getContractAt('Token20', tokenA)

    tokenAContract.mint(
      args.address,
      ethers.utils.parseUnits(args.amount, await tokenAContract.decimals()),
      {
        nonce: nonce,
      }
    )

    console.log('userBalance:', (await tokenAContract.balanceOf(args.address)).div(1e18))
  })
