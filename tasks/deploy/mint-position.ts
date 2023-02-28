import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { MINT_POSITION } from '../constants/taskNames'
import { MintPosition } from './utils/mintPosition'

class mintPositionTask {
  public mintPosition: MintPosition
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.mintPosition = new MintPosition()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(MINT_POSITION)
  .setDescription('Mint position for address')
  .setAction(async function ({ ethers }) {
    const mintPosition: mintPositionTask = new mintPositionTask()

    if (!mintPosition.mintPosition.canDeploy()) return

    await mintPosition.mintPosition.preDeployment()

    await mintPosition.mintPosition.runDeployment()

    await mintPosition.mintPosition.postDeployment()

    console.log('Mint tokens task complete.\n')
  })
