import { CurrencyAmount, Fraction, JSBI, Percent, TokenAmount, Trade } from '@nguyenphu27/sdk';
import {
  BLOCKED_PRICE_IMPACT_NON_EXPERT,
  ALLOWED_PRICE_IMPACT_HIGH,
  ALLOWED_PRICE_IMPACT_LOW,
  ALLOWED_PRICE_IMPACT_MEDIUM,
} from '../constants';

import { Field } from '../state/swap/actions';
import { basisPointsToPercent } from './index';

const SWAPPING_FEE = 20;
const BASE_FEE = new Percent(JSBI.BigInt(20), JSBI.BigInt(10000));
const SWAPPING_FEE_PERCENT = new Percent(JSBI.BigInt(20), JSBI.BigInt(10000));
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);
const INPUT_FRACTiON_AFTER_SWAPPING_FEE = ONE_HUNDRED_PERCENT.subtract(SWAPPING_FEE_PERCENT);

// computes price breakdown for the trade
export function computeTradePriceBreakdown(trade?: Trade): {
  priceImpactWithoutFee?: Percent;
  realizedLPFee?: CurrencyAmount;
  realizedSwappingFee?: CurrencyAmount;
} {
  // for each hop in our trade, take away the x*y=k price impact from 0.2% fees
  // e.g. for 3 tokens/2 hops: 1 - ((1 - .02) * (1-.02))
  const realizedLPFee = !trade
    ? undefined
    : ONE_HUNDRED_PERCENT.subtract(
        trade.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction => currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
          ONE_HUNDRED_PERCENT
        )
      );

  // for each hop in our trade, take away the x*y=k price impact from 0.2% fees
  // e.g. for 3 tokens/2 hops: 1 - ((1 - .02) * (1-.02))
  const realizedSwappingFee = !trade
    ? undefined
    : ONE_HUNDRED_PERCENT.subtract(
        trade.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction => currentFee.multiply(INPUT_FRACTiON_AFTER_SWAPPING_FEE),
          ONE_HUNDRED_PERCENT
        )
      );

  // remove lp fees from price impact
  let priceImpactWithoutFeeFraction = trade && realizedLPFee ? trade.priceImpact.subtract(realizedLPFee) : undefined;

  // remove swapping fees from price impact
  priceImpactWithoutFeeFraction =
    priceImpactWithoutFeeFraction && realizedSwappingFee
      ? priceImpactWithoutFeeFraction.subtract(realizedSwappingFee)
      : undefined;

  // the x*y=k impact
  const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
    ? new Percent(priceImpactWithoutFeeFraction?.numerator, priceImpactWithoutFeeFraction?.denominator)
    : undefined;

  // the amount of the input that accrues to LPs
  const realizedLPFeeAmount =
    realizedLPFee &&
    trade &&
    (trade.inputAmount instanceof TokenAmount
      ? new TokenAmount(trade.inputAmount.token, realizedLPFee.multiply(trade.inputAmount.raw).quotient)
      : CurrencyAmount.ether(realizedLPFee.multiply(trade.inputAmount.raw).quotient));

  // the amount of the input that accrues to Swap
  const realizedSwappingFeeAmount =
    realizedSwappingFee &&
    trade &&
    (trade.inputAmount instanceof TokenAmount
      ? new TokenAmount(trade.inputAmount.token, realizedSwappingFee.multiply(trade.inputAmount.raw).quotient)
      : CurrencyAmount.ether(realizedSwappingFee.multiply(trade.inputAmount.raw).quotient));

  return {
    priceImpactWithoutFee: priceImpactWithoutFeePercent,
    realizedLPFee: realizedLPFeeAmount,
    realizedSwappingFee: realizedSwappingFeeAmount,
  };
}

// computes the minimum amount out and maximum amount in for a trade given a user specified allowed slippage in bips
export function computeSlippageAdjustedAmounts(
  trade: Trade | undefined,
  allowedSlippage: number
): { [field in Field]?: CurrencyAmount } {
  // Add swapping fee to allowedSlippage
  const pct = basisPointsToPercent(allowedSlippage + SWAPPING_FEE);
  return {
    [Field.INPUT]: trade?.maximumAmountIn(pct),
    [Field.OUTPUT]: trade?.minimumAmountOut(pct),
  };
}

export function warningSeverity(priceImpact: Percent | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!priceImpact?.lessThan(BLOCKED_PRICE_IMPACT_NON_EXPERT)) return 4;
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_HIGH)) return 3;
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_MEDIUM)) return 2;
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_LOW)) return 1;
  return 0;
}

export function formatExecutionPrice(trade?: Trade, inverted?: boolean): string {
  if (!trade) {
    return '';
  }
  return inverted
    ? `${trade.executionPrice.invert().toSignificant(6)} ${trade.inputAmount.currency.symbol} / ${
        trade.outputAmount.currency.symbol
      }`
    : `${trade.executionPrice.toSignificant(6)} ${trade.outputAmount.currency.symbol} / ${
        trade.inputAmount.currency.symbol
      }`;
}
