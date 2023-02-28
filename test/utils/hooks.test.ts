import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { OrderBook20, OrderBookFactory20, OrderBookRouter20, Token20 } from '../../typechain'
import { GetBeforeEach } from './setup/beforeEachProps'
import { InitialSetup } from './setup/initialSetup'

const gbe = new GetBeforeEach()

before(async function () {
  hre.isAllTestSuite = true
  await gBefore()
})

export async function gBefore() {
  await gbe.getBeforeEach()
}
