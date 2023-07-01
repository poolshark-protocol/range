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
  MintCall__factory,
  BurnCall__factory,
  SwapCall__factory,
  QuoteCall__factory,
  SampleCall,
  SampleCall__factory,
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

    // const token0Address = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'token0',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const token1Address = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'token1',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const tickMathLib = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'tickMathLib',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const precisionMathLib = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'precisionMathLib',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const dydxMathLib = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'dydxMathLib',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const tickMapLib = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'tickMapLib',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress
    // const samplesLib = (
    //   await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
    //     {
    //       networkName: hre.network.name,
    //       objectName: 'samplesLib',
    //     },
    //     'readRangePoolSetup'
    //   )
    // ).contractAddress

    // hre.props.token0 = await hre.ethers.getContractAt('Token20', token0Address)
    // hre.props.token1 = await hre.ethers.getContractAt('Token20', token1Address)
    // hre.props.tickMathLib = await hre.ethers.getContractAt('TickMath', tickMathLib)
    // hre.props.precisionMathLib = await hre.ethers.getContractAt('PrecisionMath', precisionMathLib)
    // hre.props.dydxMathLib = await hre.ethers.getContractAt('DyDxMath', dydxMathLib)
    // hre.props.tickMapLib = await hre.ethers.getContractAt('TickMap', tickMapLib)
    // hre.props.samplesLib = await hre.ethers.getContractAt('Samples', samplesLib)

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Token20__factory,
      'tokenA',
      ['Wrapped Ether Test', 'WETH', this.token0Decimals]
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Token20__factory,
      'tokenB',
      ['Dai Stablecoin Test', 'DAI', this.token1Decimals]
    )

    const tokenOrder = hre.props.tokenA.address.localeCompare(hre.props.tokenB.address)
    let token0Args
    let token1Args
    if (tokenOrder < 0) {
      hre.props.token0 = hre.props.tokenA
      hre.props.token1 = hre.props.tokenB
      token0Args = ['Wrapped Ether Test', 'WETH', this.token0Decimals]
      token1Args = ['Dai Stablecoin Test', 'DAI', this.token1Decimals]
    } else {
      hre.props.token0 = hre.props.tokenB
      hre.props.token1 = hre.props.tokenA
      token0Args = ['Dai Stablecoin Test', 'DAI', this.token1Decimals]
      token1Args = ['Wrapped Ether Test', 'WETH', this.token0Decimals]
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
      Ticks__factory,
      'ticksLib',
      [],
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      Positions__factory,
      'positionsLib',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      MintCall__factory,
      'mintCall',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      BurnCall__factory,
      'burnCall',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      SwapCall__factory,
      'swapCall',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      QuoteCall__factory,
      'quoteCall',
      []
    )

    await this.deployAssist.deployContractWithRetry(
      network,
      // @ts-ignore
      SampleCall__factory,
      'sampleCall',
      []
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
        'contracts/libraries/pool/MintCall.sol:MintCall': hre.props.mintCall.address,
        'contracts/libraries/pool/BurnCall.sol:BurnCall': hre.props.burnCall.address,
        'contracts/libraries/pool/SwapCall.sol:SwapCall': hre.props.swapCall.address,
        'contracts/libraries/pool/QuoteCall.sol:QuoteCall': hre.props.quoteCall.address,
        'contracts/libraries/pool/SampleCall.sol:SampleCall': hre.props.sampleCall.address
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
        hre.props.rangePoolManager.address,
        '177159557114295710296101716160',
        '10',
        '500'
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
    const rangePoolFactoryAddress = (
      await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
        {
          networkName: hre.network.name,
          objectName: 'rangePoolFactory',
        },
        'readRangePoolSetup'
      )
    ).contractAddress
    const positionsLibAddress = (
      await this.contractDeploymentsJson.readContractDeploymentsJsonFile(
        {
          networkName: hre.network.name,
          objectName: 'positionsLib',
        },
        'readRangePoolSetup'
      )
    ).contractAddress

    hre.props.token0 = await hre.ethers.getContractAt('Token20', token0Address)
    hre.props.token1 = await hre.ethers.getContractAt('Token20', token1Address)
    hre.props.positionsLib = await hre.ethers.getContractAt('Positions', positionsLibAddress)
    hre.props.rangePool = await hre.ethers.getContractAt('RangePool', rangePoolAddress)
    hre.props.rangePoolFactory = await hre.ethers.getContractAt('RangePoolFactory', rangePoolFactoryAddress)

    return nonce
  }

  public async createRangePool(tokenA: string, tokenB: string): Promise<void> {
    const network = SUPPORTED_NETWORKS[hre.network.name.toUpperCase()]
    console.log('tokens:', hre.props.token0.address, hre.props.token1.address)
    const createPoolTxn = await hre.props.rangePoolFactory
      .connect(hre.props.alice)
      .createRangePool(
        hre.props.token0.address,
        hre.props.token1.address,
        '500',
        '79228162514264337593543950336'
    , {gasLimit: 1000000000})
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
  }
}
