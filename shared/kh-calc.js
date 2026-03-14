// shared/kh-calc.js

import { toNum, roundToStep } from './kh-format.js';

/**
 * Ermittelt KH in Gramm für eine eingegebene Menge.
 *
 * Unterstützte Fälle:
 * 1) g_per_1ke vorhanden
 *    -> amount / g_per_1ke = KE, danach * 10 = KH_g
 *
 * 2) Portionslogik mit portion_count + portion_carbs_g
 *    -> amount * (portion_carbs_g / portion_count)
 *
 * 3) Fallback: portion_count + portion_ke
 *    -> amount * ((portion_ke * 10) / portion_count)
 */
export function calcCarbsFromAmount(item, amount) {
  if (!item) return 0;

  const a = Math.max(0, toNum(amount));
  const gPer1KE = toNum(item.g_per_1ke);
  const portionCount = toNum(item.portion_count);
  const portionCarbsG = toNum(item.portion_carbs_g);
  const portionKE = toNum(item.portion_ke);

  if (gPer1KE > 0) {
    return (a / gPer1KE) * 10;
  }

  if (portionCount > 0 && portionCarbsG > 0) {
    return a * (portionCarbsG / portionCount);
  }

  if (portionCount > 0 && portionKE > 0) {
    return a * ((portionKE * 10) / portionCount);
  }

  return 0;
}

export function calcKEFromCarbs(carbsG) {
  return toNum(carbsG) / 10;
}

export function calcBEFromCarbs(carbsG) {
  return toNum(carbsG) / 12;
}

export function calcIEFromCarbs(carbsG, factor = 10, rounding = 0.1) {
  const c = Math.max(0, toNum(carbsG));
  const f = toNum(factor);

  if (f <= 0) return 0;

  const raw = c / f;
  return roundToStep(raw, rounding);
}

/**
 * Rechnet alles für ein Lebensmittel + Menge aus.
 *
 * @param {object} item
 * @param {number|string} amount
 * @param {object} options
 * @param {number} options.factor   g KH pro 1 IE
 * @param {'KE'|'BE'} options.displayUnit
 * @param {number} options.rounding Rundung für IE, z. B. 0.5 oder 0.1
 */
export function calcForItem(
  item,
  amount,
  {
    factor = 10,
    displayUnit = 'KE',
    rounding = 0.1
  } = {}
) {
  const carbsG = calcCarbsFromAmount(item, amount);
  const ke = calcKEFromCarbs(carbsG);
  const be = calcBEFromCarbs(carbsG);
  const ie = calcIEFromCarbs(carbsG, factor, rounding);

  return {
    carbsG,
    ke,
    be,
    ie,
    displayValue: String(displayUnit).toUpperCase() === 'BE' ? be : ke,
    displayUnit: String(displayUnit).toUpperCase() === 'BE' ? 'BE' : 'KE'
  };
}

/**
 * Liefert die KH-Menge pro 1 Eingabeeinheit zurück.
 * Praktisch für Live-Anzeigen oder Debugging.
 */
export function carbsPerUnit(item) {
  return calcCarbsFromAmount(item, 1);
}

/**
 * Prüft, ob ein Lebensmittel grundsätzlich berechenbar ist.
 */
export function isCalculable(item) {
  if (!item) return false;

  return (
    toNum(item.g_per_1ke) > 0 ||
    (toNum(item.portion_count) > 0 && toNum(item.portion_carbs_g) > 0) ||
    (toNum(item.portion_count) > 0 && toNum(item.portion_ke) > 0)
  );
}
