import { BigNumber } from 'ethers'
import { BN_ZERO, validateMint, validateSwap } from '../../../test/utils/contracts/rangepool'
import { InitialSetup } from '../../../test/utils/setup/initialSetup'
import { mintSigners20 } from '../../../test/utils/token'
import { getNonce } from '../../utils'

export class MintPosition {
  private initialSetup: InitialSetup
  private nonce: number

  constructor() {
    this.initialSetup = new InitialSetup()
  }

  public async preDeployment() {
    //clear out deployments json file for this network
  }

  public async runDeployment() {
    const signers = await ethers.getSigners()
    hre.props.alice = signers[0]
    console.log(hre.network.name)
    if (hre.network.name == 'hardhat') {
      hre.props.bob = signers[1]
      hre.carol = signers[2]
    }
    hre.nonce = await getNonce(hre, hre.props.alice.address)
    await this.initialSetup.readRangePoolSetup(this.nonce)
    const token0Amount = ethers.utils.parseUnits('100', await hre.props.token0.decimals())
    const token1Amount = ethers.utils.parseUnits('100', await hre.props.token1.decimals())
    await mintSigners20(hre.props.token0, token0Amount.mul(10000), [hre.props.alice])
    await mintSigners20(hre.props.token1, token1Amount.mul(10000), [hre.props.alice])

    const liquidityAmount = BigNumber.from('44721359549995793929')

    // 0x34e800D1456d87A5F62B774AD98cea54a3A40048
    // 0x1DcF623EDf118E4B21b4C5Dc263bb735E170F9B8
    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: token1Amount.mul(10000),
      sqrtPriceLimitX96: BigNumber.from('3543191142285914205922034323214'),
      balanceInDecrease: token1Amount.mul(30),
      balanceOutIncrease: token1Amount.mul(30),
      revertMessage:''
    })
    // await validateMint({
    //   signer: hre.props.alice,
    //   recipient: hre.props.alice.address,
    //   lower: '-887270',
    //   upper: '887270',
    //   amount0: token0Amount,
    //   amount1: token1Amount,
    //   fungible: true,
    //   balance0Decrease: BigNumber.from('0'),
    //   balance1Decrease: token1Amount,
    //   liquidityIncrease: liquidityAmount,
    //   revertMessage: '',
    //   balanceCheck: false
    // })

    // await validateMint({
    //   signer: hre.props.alice,
    //   recipient: '0x34e800D1456d87A5F62B774AD98cea54a3A40048',
    //   lower: '-887270',
    //   upper: '887270',
    //   amount0: token0Amount,
    //   amount1: token1Amount,
    //   fungible: true,
    //   balance0Decrease: BigNumber.from('0'),
    //   balance1Decrease: token1Amount,
    //   liquidityIncrease: liquidityAmount,
    //   revertMessage: '',
    // })

    // await validateMint({
    //   signer: hre.props.alice,
    //   recipient: '0x1DcF623EDf118E4B21b4C5Dc263bb735E170F9B8',
    //   lower: '-887270',
    //   upper: '887270',
    //   amount0: token0Amount,
    //   amount1: token1Amount,
    //   fungible: true,
    //   balance0Decrease: BigNumber.from('0'),
    //   balance1Decrease: token1Amount,
    //   liquidityIncrease: liquidityAmount,
    //   revertMessage: '',
    // })

    console.log('position minted', (await hre.props.rangePool.poolState()).price.toString())
  }

  public async postDeployment() {}

  public canDeploy(): boolean {
    let canDeploy = true

    if (!hre.network.name) {
      console.log('❌ ERROR: No network name present.')
      canDeploy = false
    }

    return canDeploy
  }
}
