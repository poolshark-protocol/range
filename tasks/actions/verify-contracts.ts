import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { VERIFY_CONTRACTS } from '../constants/taskNames'
import { VerifyContracts } from '../deploy/utils/verifyContracts'

class VerifyContractsTask {
  public verifyContracts: VerifyContracts
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.verifyContracts = new VerifyContracts()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(VERIFY_CONTRACTS)
  .setDescription('Verify contract addresses')
  .addOptionalParam('contract', "The single contract's name to verify", '')
  .setAction(async function ({ ethers, contract }) {
    const verifyContracts: VerifyContractsTask = new VerifyContractsTask()

    if (!verifyContracts.verifyContracts.canDeploy()) return

    await verifyContracts.verifyContracts.preDeployment()

    await verifyContracts.verifyContracts.runDeployment(contract)

    await verifyContracts.verifyContracts.postDeployment()

    console.log('Verify contracts task complete.\n')
  })
