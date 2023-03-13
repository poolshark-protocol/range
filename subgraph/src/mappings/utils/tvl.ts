/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BigDecimal } from '@graphprotocol/graph-ts'
import { BasePrice, RangePoolFactory, RangePool, Token } from '../../../generated/schema'
import { AmountType, getAdjustedAmounts } from './price'

/**
 * Updates all dervived TVL values. This includes all ETH and USD
 * TVL metrics for a given pool, as well as in the aggregate factory.
 *
 * NOTE: tokens locked should be updated before this function is called,
 * as this logic starts its calculations based on TVL for token0 and token1
 * in the pool.
 *
 * This function should be used whenever the TVL of tokens changes within a pool.
 * Aka: mint, burn, swap, collect
 *
 * @param pool
 * @param factory
 * @param oldPoolTotalValueLockedETH
 */
export function updateDerivedTVLAmounts(
  pool: RangePool,
  factory: RangePoolFactory,
  oldRangePoolTotalValueLockedEth: BigDecimal
): void {
  let basePrice = BasePrice.load('1')
  let token0 = Token.load(pool.token0)
  let token1 = Token.load(pool.token1)

  if (token0 === null || token1 === null || basePrice === null) {
    return
  }

  // Update token TVL values.
  token0.totalValueLockedUsd = token0.totalValueLocked.times(token0.ethPrice.times(basePrice.ethUsd))
  token1.totalValueLockedUsd = token1.totalValueLocked.times(token1.ethPrice.times(basePrice.ethUsd))

  // Get tracked and untracked amounts based on tokens in pool.
  let amounts: AmountType = getAdjustedAmounts(pool.totalValueLocked0, token0, pool.totalValueLocked1, token1)

  // Update pool TVL values.
  pool.totalValueLockedEth = amounts.eth
  pool.totalValueLockedUsd = amounts.usd
  // Reset factory amounts before adding new TVL value.
  factory.totalValueLockedEth = factory.totalValueLockedEth.minus(oldRangePoolTotalValueLockedEth)

  // Add new TVL based on pool.
  factory.totalValueLockedEth = factory.totalValueLockedEth.plus(amounts.eth)
  factory.totalValueLockedUsd = factory.totalValueLockedEth.times(basePrice.ethUsd)

  // Save entities.
  token0.save()
  token1.save()
  factory.save()
  pool.save()
}
