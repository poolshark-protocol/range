import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOLS } from '../constants/taskNames'
import { DeployRangePools } from '../deploy/utils/deployRangePools'

class DeployRangePoolsTask {
  public deployHedgePools: DeployRangePools
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployHedgePools = new DeployRangePools()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(DEPLOY_RANGEPOOLS)
  .setDescription('Deploys Hedge Pools')
  .setAction(async function ({ ethers }) {
    const deployHedgePools: DeployRangePoolsTask = new DeployRangePoolsTask()

    if (!deployHedgePools.deployHedgePools.canDeploy()) return

    await deployHedgePools.deployHedgePools.preDeployment()

    await deployHedgePools.deployHedgePools.runDeployment()

    await deployHedgePools.deployHedgePools.postDeployment()

    console.log('Hedge pool deployment complete.\n')
  })
