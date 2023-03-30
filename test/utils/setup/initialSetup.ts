import { SUPPORTED_NETWORKS } from '../../../scripts/constants/supportedNetworks'
import { DeployAssist } from '../../../scripts/util/deployAssist'
import { ContractDeploymentsKeys } from '../../../scripts/util/files/contractDeploymentKeys'
import { ContractDeploymentsJson } from '../../../scripts/util/files/contractDeploymentsJson'
import {
  Token20__factory,
  RangePoolFactory__factory,
  Ticks__factory,
  TickMath__factory,
  DyDxMath__factory,
  PrecisionMath__factory,
  Positions__factory,
  RangePoolManager__factory,
  TickMap__factory,
  Samples__factory,
} from '../../../typechain'

export class InitialSetup {
  private token0Decimals = 18
  private token1Decimals = 18
  private deployAssist: DeployAssist
  private contractDeploymentsJson: ContractDeploymentsJson
  private contractDeploymentsKeys: ContractDeploymentsKeys

  constructor() {
    this.deployAssist = new DeployAssist()
    this.contractDeploymentsJson = new ContractDeploymentsJson()
    this.contractDeploymentsKeys = new ContractDeploymentsKeys()
  }

  public async initialRangePoolSetup(): Promise<number> {
    const network = SUPPORTED_NETWORKS[hre.network.name.toUpperCase()]

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Token20__factory,
      'tokenA',
      ['Token20A', 'TOKEN20A', this.token0Decimals]
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Token20__factory,
      'tokenB',
      ['Token20B', 'TOKEN20B', this.token1Decimals]
    )

    const tokenOrder = hre.props.tokenA.address.localeCompare(hre.props.tokenB.address)
    let token0Args
    let token1Args
    if (tokenOrder < 0) {
      hre.props.token0 = hre.props.tokenA
      hre.props.token1 = hre.props.tokenB
      token0Args = ['Token20A', 'TOKEN20A', this.token0Decimals]
      token1Args = ['Token20B', 'TOKEN20B', this.token1Decimals]
    } else {
      hre.props.token0 = hre.props.tokenB
      hre.props.token1 = hre.props.tokenA
      token0Args = ['Token20B', 'TOKEN20B', this.token1Decimals]
      token1Args = ['Token20A', 'TOKEN20A', this.token0Decimals]
    }
    this.deployAssist.saveContractDeployment(
      network,
      'Token20',
      'token0',
      hre.props.token0,
      token0Args
    )
    this.deployAssist.saveContractDeployment(
      network,
      'Token20',
      'token1',
      hre.props.token1,
      token1Args
    )
    this.deployAssist.deleteContractDeployment(network, 'tokenA')
    this.deployAssist.deleteContractDeployment(network, 'tokenB')

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      TickMath__factory,
      'tickMathLib',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      PrecisionMath__factory,
      'precisionMathLib',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      DyDxMath__factory,
      'dydxMathLib',
      [],
      {
        'contracts/libraries/PrecisionMath.sol:PrecisionMath':
          hre.props.precisionMathLib.address,
      }
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      TickMap__factory,
      'tickMapLib',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Samples__factory,
      'samplesLib',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Ticks__factory,
      'ticksLib',
      [],
      {
        'contracts/libraries/DyDxMath.sol:DyDxMath': hre.props.dydxMathLib.address,
        'contracts/libraries/PrecisionMath.sol:PrecisionMath':
          hre.props.precisionMathLib.address,
        'contracts/libraries/TickMath.sol:TickMath': hre.props.tickMathLib.address,
        'contracts/libraries/TickMap.sol:TickMap': hre.props.tickMapLib.address,
        'contracts/libraries/Samples.sol:Samples': hre.props.samplesLib.address
      }
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Positions__factory,
      'positionsLib',
      [],
      {
        'contracts/libraries/DyDxMath.sol:DyDxMath': hre.props.dydxMathLib.address,
        'contracts/libraries/PrecisionMath.sol:PrecisionMath':
          hre.props.precisionMathLib.address,
        'contracts/libraries/TickMath.sol:TickMath': hre.props.tickMathLib.address,
        'contracts/libraries/Ticks.sol:Ticks': hre.props.ticksLib.address,
      }
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      RangePoolManager__factory,
      'rangePoolManager',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      RangePoolFactory__factory,
      'rangePoolFactory',
      [
        hre.props.rangePoolManager.address
      ],
      {
        'contracts/libraries/Positions.sol:Positions': hre.props.positionsLib.address,
        'contracts/libraries/Ticks.sol:Ticks': hre.props.ticksLib.address,
        'contracts/libraries/PrecisionMath.sol:PrecisionMath':
          hre.props.precisionMathLib.address,
        'contracts/libraries/TickMath.sol:TickMath': hre.props.tickMathLib.address,
        'contracts/libraries/DyDxMath.sol:DyDxMath': hre.props.dydxMathLib.address,
        'contracts/libraries/Samples.sol:Samples': hre.props.samplesLib.address
      }
    )
    const setFactoryTxn = await hre.props.rangePoolManager
      .connect(hre.props.admin)
      .setFactory(
        hre.props.rangePoolFactory.address
    )
    await setFactoryTxn.wait()

    hre.nonce += 1

    const createPoolTxn = await hre.props.rangePoolFactory
      .connect(hre.props.admin)
      .createRangePool(
        hre.props.token0.address,
        hre.props.token1.address,
        '500',
        '177159557114295710296101716160'
    )
    await createPoolTxn.wait()

    hre.nonce += 1

    const rangePoolAddress = await hre.props.rangePoolFactory.getRangePool(
      hre.props.token0.address,
      hre.props.token1.address,
      '500'
    )
    hre.props.rangePool = await hre.ethers.getContractAt('RangePool', rangePoolAddress)

    await this.deployAssist.saveContractDeployment(
      network,
      'RangePool',
      'rangePool',
      hre.props.rangePool,
      [
        hre.props.token0.address,
        hre.props.token1.address,
        '10', '500', '177159557114295710296101716160'
      ]
    )

    return hre.nonce
  }

  public async readRangePoolSetup(nonce: number): Promise<number> {
    const token0Address = (
      await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
        {
          networkName: hre.network.name,
          objectName: 'token0',
        },
        'readRangePoolSetup'
      )
    ).contractAddress
    const token1Address = (
      await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
        {
          networkName: hre.network.name,
          objectName: 'token1',
        },
        'readRangePoolSetup'
      )
    ).contractAddress
    const rangePoolAddress = (
      await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
        {
          networkName: hre.network.name,
          objectName: 'rangePool',
        },
        'readRangePoolSetup'
      )
    ).contractAddress

    hre.props.token0 = await hre.ethers.getContractAt('Token20', token0Address)
    hre.props.token1 = await hre.ethers.getContractAt('Token20', token1Address)
    hre.props.rangePool = await hre.ethers.getContractAt('RangePool', rangePoolAddress)

    return nonce
  }
}
