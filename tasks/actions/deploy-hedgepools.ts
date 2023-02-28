import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOLS } from '../constants/taskNames'
import { DeployHedgePools } from '../deploy/utils/deployRangePools'

class DeployHedgePoolsTask {
  public deployHedgePools: DeployHedgePools
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployHedgePools = new DeployHedgePools()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(DEPLOY_RANGEPOOLS)
  .setDescription('Deploys Hedge Pools')
  .setAction(async function ({ ethers }) {
    const deployHedgePools: DeployHedgePoolsTask = new DeployHedgePoolsTask()

    if (!deployHedgePools.deployHedgePools.canDeploy()) return

    await deployHedgePools.deployHedgePools.preDeployment()

    await deployHedgePools.deployHedgePools.runDeployment()

    await deployHedgePools.deployHedgePools.postDeployment()

    console.log('Hedge pool deployment complete.\n')
  })
