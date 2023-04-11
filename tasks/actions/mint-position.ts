import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { MINT_TOKENS } from '../constants/taskNames'
import { MintPosition } from '../deploy/utils/mintPosition'

class MintPositionTask {
  public mintTokens: MintPosition
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.mintTokens = new MintPosition()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(MINT_TOKENS)
  .setDescription('Mint tokens for address')
  .setAction(async function ({ ethers }) {
    const mintTokens: MintPositionTask = new MintPositionTask()

    if (!mintTokens.mintTokens.canDeploy()) return

    await mintTokens.mintTokens.preDeployment()

    await mintTokens.mintTokens.runDeployment()

    await mintTokens.mintTokens.postDeployment()

    console.log('Mint tokens task complete.\n')
  })
