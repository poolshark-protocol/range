import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HardhatRuntimeEnvironment, Network } from 'hardhat/types'
import { BeforeEachProps } from './test/utils/setup/beforeEachProps'

interface CustomHardhatRuntimeEnvironment extends HardhatRuntimeEnvironment {}

export interface PoolsharkRuntimeEnvironment extends CustomHardhatRuntimeEnvironment {
  props: BeforeEachProps
  adminA: SignerWithAddress
  adminB: SignerWithAddress
  alice: SignerWithAddress
  bob: SignerWithAddress
  carol: SignerWithAddress
  isAllTestSuite: boolean
  network: Network
  nonce: number
}
