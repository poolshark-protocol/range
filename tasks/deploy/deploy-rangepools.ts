import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOLS } from '../constants/taskNames'
import { DeployRangePools } from './utils/deployRangePools'

class DeployRangePoolsTask {
  public deployRangePools: DeployRangePools
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployRangePools = new DeployRangePools()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(DEPLOY_RANGEPOOLS)
  .setDescription('Deploys Range Pools')
  .setAction(async function ({ ethers }) {
    const deployRangePools: DeployRangePoolsTask = new DeployRangePoolsTask()

    if (!deployRangePools.deployRangePools.canDeploy()) return

    await deployRangePools.deployRangePools.preDeployment()

    await deployRangePools.deployRangePools.runDeployment()

    await deployRangePools.deployRangePools.postDeployment()

    console.log('Range pool deployment complete.\n')
  })
