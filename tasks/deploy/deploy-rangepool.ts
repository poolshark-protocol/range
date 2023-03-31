import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOL } from '../constants/taskNames'
import { DeployRangePool } from './utils/deployRangePool'

class DeployRangePoolTask {
  public deployRangePool: DeployRangePool
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployRangePool = new DeployRangePool()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(DEPLOY_RANGEPOOL)
  .setDescription('Deploys Range Pool')
  .setAction(async function ({ ethers }) {
    const deployRangePool: DeployRangePoolTask = new DeployRangePoolTask()

    if (!deployRangePool.deployRangePool.canDeploy()) return

    await deployRangePool.deployRangePool.preDeployment()

    await deployRangePool.deployRangePool.runDeployment()

    await deployRangePool.deployRangePool.postDeployment()

    console.log('Range pool deployment complete.\n')
  })
