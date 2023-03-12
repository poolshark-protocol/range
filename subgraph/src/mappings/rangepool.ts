import { handleMint as handleMintHelper } from './rangepool/mint'
import { handleBurn as handleBurnHelper } from './rangepool/burn'
import { handleSwap as handleSwapHelper } from './rangepool/swap'
import { handleCompound as handleCompoundHelper } from './rangepool/compound'
import { Mint, Burn, Swap} from '../../generated/templates/RangePoolTemplate/RangePool'
import { Compound } from '../../generated/RangePoolFactory/RangePool'

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