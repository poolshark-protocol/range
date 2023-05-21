import { handleMint as handleMintHelper } from './rangepool/mint'
import { handleBurn as handleBurnHelper } from './rangepool/burn'
import { handleSwap as handleSwapHelper } from './rangepool/swap'
import { handleTransferSingle as handleTransferSingleHelper } from './rangepoolerc1155'
import { handleCompound as handleCompoundHelper } from './rangepool/compound'
import { Mint, Burn, Swap, Compound} from '../../generated/RangePoolFactory/RangePool'
import { TransferSingle } from '../../generated/templates/RangePoolTemplate/RangePool'

export function handleMint(event: Mint): void {
  handleMintHelper(event)
}

export function handleBurn(event: Burn): void {
  handleBurnHelper(event)
}

export function handleCompound(event: Compound): void {
    handleCompoundHelper(event)
}

export function handleSwap(event: Swap): void {
  handleSwapHelper(event)
}

export function handleTransferSingle(event: TransferSingle): void {
  handleTransferSingleHelper(event)
}