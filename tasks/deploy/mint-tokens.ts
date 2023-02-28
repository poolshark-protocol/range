import { task } from 'hardhat/config'
import { GetBeforeEach } from '../../test/utils/setup/beforeEachProps'
import { MINT_TOKENS } from '../constants/taskNames'
import { MintTokens } from './utils/mintTokens'

class MintTokensTask {
  public mintTokens: MintTokens
  public getBeforeEach: GetBeforeEach

  constructor() {
    this.mintTokens = new MintTokens()
    this.getBeforeEach = new GetBeforeEach()
    hre.props = this.getBeforeEach.retrieveProps()
  }
}

task(MINT_TOKENS)
  .setDescription('Mint tokens for address')
  .setAction(async function ({ ethers }) {
    const mintTokens: MintTokensTask = new MintTokensTask()

    if (!mintTokens.mintTokens.canDeploy()) return

    await mintTokens.mintTokens.preDeployment()

    await mintTokens.mintTokens.runDeployment()

    await mintTokens.mintTokens.postDeployment()

    console.log('Mint tokens task complete.\n')
  })
