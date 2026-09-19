/**
 * pricingService — единственный источник правды по ценам на фронте.
 *
 * Правила (идентичны серверным в supabase/functions/order-processing):
 *  - надбавка за платную кастомизацию корпуса: +10%, применяется ОДИН раз к unit price;
 *  - только accent (бант / ручки) → надбавки нет;
 *  - лестница скидок по сумме корзины: 20k→2%, 30k→3%, 40k→4%, 50k→5%;
 *  - округление: надбавка Math.round, скидка Math.floor, всё в целых рублях.
 */

export const SURCHARGE_PCT = 10;

export const DISCOUNT_TIERS = [
  { min: 50000, pct: 5 },
  { min: 40000, pct: 4 },
  { min: 30000, pct: 3 },
  { min: 20000, pct: 2 },
];

/** Изменены ли платные зоны корпуса (MAIN / SIDE). */
export function isPaidBoxCustomization(customization) {
  if (!customization) return false;
  return Boolean(
    (customization.main && customization.main.changed) ||
    (customization.side && customization.side.changed)
  );
}

/** Надбавка в процентах для позиции корзины. */
export function surchargePctFor(customization) {
  return isPaidBoxCustomization(customization) ? SURCHARGE_PCT : 0;
}

/** Цена за единицу с надбавкой, до скидки корзины. */
export function unitPriceWithSurcharge(baseUnitPrice, surchargePct) {
  const base = Number(baseUnitPrice) || 0;
  const pct = Number(surchargePct) || 0;
  return Math.round(base * (1 + pct / 100));
}

/** Процент скидки по сумме корзины. */
export function discountPctFor(subtotal) {
  const tier = DISCOUNT_TIERS.find(t => subtotal >= t.min);
  return tier ? tier.pct : 0;
}

/**
 * Полный расчёт корзины.
 * @param {Array<{baseUnitPrice:number, quantity:number, customization?:object, surchargePct?:number}>} lines
 * @returns {{lines:Array, subtotal:number, discountPct:number, discount:number, total:number}}
 */
export function computeCart(lines) {
  const priced = (lines || []).map(line => {
    const baseUnitPrice = Number(line.baseUnitPrice) || 0;
    const quantity = Math.max(0, parseInt(line.quantity, 10) || 0);
    const surchargePct = line.surchargePct != null
      ? Number(line.surchargePct) || 0
      : surchargePctFor(line.customization);
    const unitPriceBeforeDiscount = unitPriceWithSurcharge(baseUnitPrice, surchargePct);
    return {
      ...line,
      baseUnitPrice,
      quantity,
      surchargePct,
      unitPriceBeforeDiscount,
      lineSubtotal: unitPriceBeforeDiscount * quantity,
    };
  });

  const subtotal = priced.reduce((s, l) => s + l.lineSubtotal, 0);
  const discountPct = discountPctFor(subtotal);
  const discount = Math.floor((subtotal * discountPct) / 100);
  const total = subtotal - discount;

  const withPricing = priced.map(l => {
    const finalUnitPrice = Math.round(l.unitPriceBeforeDiscount * (1 - discountPct / 100));
    return {
      ...l,
      pricing: {
        baseUnitPrice: l.baseUnitPrice,
        surchargePct: l.surchargePct,
        unitPriceBeforeDiscount: l.unitPriceBeforeDiscount,
        cartDiscountPct: discountPct,
        finalUnitPrice,
        quantity: l.quantity,
        lineTotal: l.lineSubtotal,
      },
    };
  });

  return { lines: withPricing, subtotal, discountPct, discount, total };
}

export const pricingService = {
  SURCHARGE_PCT,
  DISCOUNT_TIERS,
  isPaidBoxCustomization,
  surchargePctFor,
  unitPriceWithSurcharge,
  discountPctFor,
  computeCart,
};

export default pricingService;
