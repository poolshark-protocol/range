import { InitialSetup } from '../../../test/utils/setup/initialSetup'
import { mintSigners20 } from '../../../test/utils/token'
import { getNonce } from '../../utils'

export class MintTokens {
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
    console.log('running address:', hre.props.alice.address)
    if (hre.network.name == 'hardhat') {
      hre.props.bob = signers[1]
      hre.carol = signers[2]
    }
    hre.nonce = await getNonce(hre, hre.props.alice.address)
    console.log(this.nonce)
    await this.initialSetup.readRangePoolSetup(this.nonce)
    const token0Amount = ethers.utils.parseUnits('100', await hre.props.token0.decimals())
    const token1Amount = ethers.utils.parseUnits('100', await hre.props.token1.decimals())
    await mintSigners20(hre.props.token0, token0Amount.mul(10), [hre.props.alice])
    await mintSigners20(hre.props.token1, token1Amount.mul(10), [hre.props.alice])

    const token0Balance = await hre.props.token0.balanceOf(
      '0xAc553A368D938D38B6ca742c761fcCDc25fac90a'
    )
    console.log(
      '0xAc553A368D938D38B6ca742c761fcCDc25fac90a',
      'token 0 balance:',
      token0Balance.toString()
    )
    const token1Balance = await hre.props.token1.balanceOf(
      '0xAc553A368D938D38B6ca742c761fcCDc25fac90a'
    )
    console.log(
      '0xAc553A368D938D38B6ca742c761fcCDc25fac90a',
      'token 1 balance:',
      token1Balance.toString()
    )
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
