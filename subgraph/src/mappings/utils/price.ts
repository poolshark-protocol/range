/* eslint-disable prefer-const */
import { MINIMUM_ETH_LOCKED, ONE_BD, STABLE_COINS, STABLE_IS_TOKEN_0, STABLE_POOL_ADDRESS, WETH_ADDRESS, WHITELIST_TOKENS, ZERO_BD, ZERO_BI } from '../../constants/constants'
import { BasePrice, RangePool, Token } from '../../../generated/schema'
import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { exponentToBigDecimal, safeDiv } from './math'
import { BIGDECIMAL_ZERO, BIGINT_ZERO } from './helpers'
import { safeLoadBasePrice, safeLoadToken } from './loads'

export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt, token0: Token, token1: Token): BigDecimal[] {
  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
  let Q192 = BigInt.fromI32(2).pow(192).toBigDecimal()
  let price1 = num
    .div(Q192)
    .times(exponentToBigDecimal(token0.decimals))
    .div(exponentToBigDecimal(token1.decimals))

  let price0 = BIGDECIMAL_ZERO
  if (price1.gt(BIGDECIMAL_ZERO)) {
    price0 = safeDiv(BigDecimal.fromString('1'), price1);
  }
  
  return [price0, price1]
}

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let stablePool = RangePool.load(STABLE_POOL_ADDRESS) // stable is token0
  if (stablePool !== null) {
    if (STABLE_IS_TOKEN_0) {
      log.info('stable pool token0: {}', [stablePool.price0.toString()])
      return stablePool.price0
    } else {
      log.info('stable pool token1: {}', [stablePool.price1.toString()])
      return stablePool.price1
    }
  } else {
    return ZERO_BD
  }
}

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token, otherToken: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    log.info('weth address match',[])
    return ONE_BD
  } else {
    log.info('weth address mismatch {} {}',[WETH_ADDRESS, token.id])
  }
  let whiteList = token.whitelistPools
  // for now just take USD from pool with greatest TVL
  // need to update this to actually detect best rate based on liquidity distribution
  let largestLiquidityETH = ZERO_BD
  let priceSoFar = ZERO_BD
  let basePrice = safeLoadBasePrice('eth').entity

  if (basePrice === null) {
    return ZERO_BD
  }

  // hardcoded fix for incorrect rates
  // if whitelist includes token - get the safe price
  if (STABLE_COINS.includes(token.id)) {
    priceSoFar = safeDiv(ONE_BD, basePrice.USD)
  } else {
    for (let i = 0; i < whiteList.length; ++i) {
      let poolAddress = whiteList[i]
      let pool = RangePool.load(poolAddress)

      if (pool === null) {
        continue
      }

      if (pool.liquidity.gt(ZERO_BI)) {
        if (pool.token0 == token.id) {
          // whitelist token is token1
          let token1: Token
          if (pool.token1 != otherToken.id)
             token1 = safeLoadToken(pool.token1).entity
          else
            token1 = otherToken
          if (token1 === null) {
            continue
          }
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLocked1.times(token1.ethPrice)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token0))
          ) {
            largestLiquidityETH = ethLocked
            // token1 per our token * Eth per token1
            priceSoFar = pool.price1.times(token1.ethPrice as BigDecimal)
          }
        }
        if (pool.token1 == token.id) {
          let token0: Token
          if (pool.token0 != otherToken.id)
              token0 = safeLoadToken(pool.token0).entity
          else
              token0 = otherToken
          if (token0 === null) {
            continue
          }
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLocked0.times(token0.ethPrice)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token1))
          ) {
            largestLiquidityETH = ethLocked
            // token0 per our token * ETH per token0
            priceSoFar = pool.price0.times(token0.ethPrice as BigDecimal)
          }
        }
      }
    }
  }
  return priceSoFar // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let basePrice = safeLoadBasePrice('eth').entity

  if (basePrice === null) {
    return ZERO_BD
  }

  let price0USD = token0.ethPrice.times(basePrice.USD)
  let price1USD = token1.ethPrice.times(basePrice.USD)

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).plus(tokenAmount1.times(price1USD))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(price1USD).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountETH(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let ethPrice0 = token0.ethPrice
  let ethPrice1 = token1.ethPrice

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(ethPrice0).plus(tokenAmount1.times(ethPrice1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(ethPrice0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(ethPrice1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

export class AmountType {
  eth: BigDecimal
  usd: BigDecimal
  ethUntracked: BigDecimal
  usdUntracked: BigDecimal
}

export function getAdjustedAmounts(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): AmountType {
  let ethPrice0 = token0.ethPrice
  let ethPrice1 = token1.ethPrice
  let basePrice = safeLoadBasePrice('eth').entity

  if (basePrice === null) {
    return { eth: ZERO_BD, usd: ZERO_BD, ethUntracked: ZERO_BD, usdUntracked: ZERO_BD }
  }

  let eth = ZERO_BD
  let ethUntracked = tokenAmount0.times(ethPrice0).plus(tokenAmount1.times(ethPrice1))

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    eth = ethUntracked
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    eth = tokenAmount0.times(ethPrice0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    eth = tokenAmount1.times(ethPrice1).times(BigDecimal.fromString('2'))
  }

  // Define USD values based on ETH derived values.
  let usd = eth.times(basePrice.USD)
  let usdUntracked = ethUntracked.times(basePrice.USD)

  return { eth, usd, ethUntracked, usdUntracked }
}
