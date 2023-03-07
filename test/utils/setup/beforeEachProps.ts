import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { getNonce } from '../../../tasks/utils'
import {
  DyDxMath,
  PrecisionMath,
  RangePool,
  RangePoolFactory,
  Positions,
  TickMath,
  Ticks,
  Token20,
  RangePoolAdmin,
} from '../../../typechain'
import { TwapOracle } from '../../../typechain/TwapOracle'
import { InitialSetup } from './initialSetup'

export interface BeforeEachProps {
  rangePool: RangePool
  rangePoolAdmin: RangePoolAdmin
  rangePoolFactory: RangePoolFactory
  tickMathLib: TickMath
  dydxMathLib: DyDxMath
  precisionMathLib: PrecisionMath
  ticksLib: Ticks
  twapOracleLib: TwapOracle
  positionsLib: Positions
  tokenA: Token20
  tokenB: Token20
  token0: Token20
  token1: Token20
  token20: Token20
  admin: SignerWithAddress
  alice: SignerWithAddress
  bob: SignerWithAddress
  carol: SignerWithAddress
}

export class GetBeforeEach {
  private initialSetup: InitialSetup
  private nonce: number

  constructor() {
    this.initialSetup = new InitialSetup()
  }

  public async getBeforeEach() {
    hre.props = this.retrieveProps()
    const signers = await ethers.getSigners()
    hre.props.admin = signers[0]
    hre.props.alice = signers[0]
    if (hre.network.name == 'hardhat') {
      hre.props.bob = signers[1]
      hre.carol = signers[2]
    }
    hre.nonce = await getNonce(hre, hre.props.alice.address)
    this.nonce = await this.initialSetup.initialRangePoolSetup()
  }

  public retrieveProps(): BeforeEachProps {
    let rangePool: RangePool
    let rangePoolAdmin: RangePoolAdmin
    let rangePoolFactory: RangePoolFactory
    let tickMathLib: TickMath
    let dydxMathLib: DyDxMath
    let precisionMathLib: PrecisionMath
    let ticksLib: Ticks
    let twapOracleLib: TwapOracle
    let positionsLib: Positions
    let tokenA: Token20
    let tokenB: Token20
    let token0: Token20
    let token1: Token20
    let token20: Token20
    let admin: SignerWithAddress
    let alice: SignerWithAddress
    let bob: SignerWithAddress
    let carol: SignerWithAddress

    return {
      rangePool,
      rangePoolAdmin,
      rangePoolFactory,
      tickMathLib,
      dydxMathLib,
      precisionMathLib,
      ticksLib,
      twapOracleLib,
      positionsLib,
      tokenA,
      tokenB,
      token0,
      token1,
      token20,
      admin,
      alice,
      bob,
      carol,
    }
  }
}
