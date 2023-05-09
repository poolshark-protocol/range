import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { MINT_TOKENS } from '../constants/taskNames'
import { MintPosition } from '../deploy/utils/mintPosition'

class MintPositionTask {
  public mintPosition: MintPosition
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.mintPosition = new MintPosition()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(MINT_TOKENS)
  .setDescription('Mint tokens for address')
  .setAction(async function ({ ethers }) {
    const mintPosition: MintPositionTask = new MintPositionTask()

    if (!mintPosition.mintPosition.canDeploy()) return

    await mintPosition.mintPosition.preDeployment()

    await mintPosition.mintPosition.runDeployment()

    await mintPosition.mintPosition.postDeployment()

    console.log('Mint tokens task complete.\n')
  })
