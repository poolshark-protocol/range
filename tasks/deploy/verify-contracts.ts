import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { DEPLOY_RANGEPOOLS, VERIFY_CONTRACTS } from '../constants/taskNames'
import { VerifyContracts } from './utils/verifyContracts'

class VerifyContractsTask {
  public deployRangePools: VerifyContracts
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.deployRangePools = new VerifyContracts()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(VERIFY_CONTRACTS)
  .setDescription('Verifies all contracts')
  .setAction(async function ({ ethers }) {
    const deployRangePools: VerifyContractsTask = new VerifyContractsTask()

    if (!deployRangePools.deployRangePools.canDeploy()) return

    await deployRangePools.deployRangePools.preDeployment()

    await deployRangePools.deployRangePools.runDeployment()

    await deployRangePools.deployRangePools.postDeployment()

    console.log('Contract verification complete.\n')
  })
