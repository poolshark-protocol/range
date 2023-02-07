/* eslint-disable no-var */
import { PoolsharkRuntimeEnvironment } from "./CustomHardhatEnvironment";

declare global {
    var hre: PoolsharkRuntimeEnvironment;
    var ethers: any; // FIXME: mock out
}

export {};