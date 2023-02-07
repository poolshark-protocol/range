
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { HardhatRuntimeEnvironment, Network } from 'hardhat/types';
import { BeforeEachProps } from './test/utils/setup/beforeEachProps';

interface PoolsharkHardhatRuntimeEnvironment
    extends HardhatRuntimeEnvironment {
}

export interface PoolsharkRuntimeEnvironment
    extends PoolsharkHardhatRuntimeEnvironment {
    props: BeforeEachProps;
    adminA: SignerWithAddress;
    adminB: SignerWithAddress;
    alice: SignerWithAddress;
    bob: SignerWithAddress;
    carol: SignerWithAddress;
    isAllTestSuite: boolean;
    network: Network;
    nonce: number;
}
