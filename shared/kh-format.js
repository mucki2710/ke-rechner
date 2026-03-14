// shared/kh-format.js

/**
 * Wandelt Eingaben robust in Number um.
 * Unterstützt:
 * - Zahlen
 * - Strings mit Komma oder Punkt
 * - leere / ungültige Werte -> 0
 */
export function toNum(v) {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0;
  }

  const s = String(v ?? '')
    .trim()
    .replace(',', '.');

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Begrenzt einen Wert auf min/max.
 */
export function clamp(value, min, max) {
  const v = toNum(value);
  return Math.min(Math.max(v, min), max);
}

/**
 * Rundet auf eine Schrittweite.
 * Beispiele:
 * - roundToStep(1.23, 0.1) => 1.2
 * - roundToStep(1.26, 0.1) => 1.3
 * - roundToStep(1.24, 0.5) => 1.0
 * - roundToStep(1.26, 0.5) => 1.5
 */
export function roundToStep(value, step = 0) {
  const v = toNum(value);
  const s = toNum(step);

  if (s <= 0) return v;
  return Math.round(v / s) * s;
}

/**
 * Formatiert Zahlen für interne UI-Anzeigen.
 * Entfernt unnötige Nachkommastellen.
 */
export function fmt(value, digits = 1) {
  const n = toNum(value);
  const d = Math.max(0, Math.trunc(toNum(digits)));
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: d
  });
}

/**
 * Alias für sichtbare Werte.
 * Kann später separat angepasst werden.
 */
export function fmtDisplay(value, digits = 1) {
  return fmt(value, digits);
}

/**
 * Liefert die kurze Einheit für ein Lebensmittel.
 *
 * Erwartete mögliche item.unit_kind-Werte:
 * - g
 * - ml
 * - piece
 * - slice
 * - tbsp
 * - tsp
 * - cup
 * - glass
 *
 * Fallback: item.portion_name oder "Einheit"
 */
export function foodUnit(item) {
  const k = String(item?.unit_kind ?? '').trim().toLowerCase();
  const portionName = String(item?.portion_name ?? '').trim();

  switch (k) {
    case 'g':
      return 'g';
    case 'ml':
      return 'ml';
    case 'piece':
      return 'Stück';
    case 'slice':
      return 'Scheibe';
    case 'tbsp':
      return 'EL';
    case 'tsp':
      return 'TL';
    case 'cup':
      return 'Tasse';
    case 'glass':
      return 'Glas';
    default:
      return portionName || 'Einheit';
  }
}

/**
 * Formatiert eine Menge zusammen mit der passenden Einheit.
 * Beispiele:
 * - 125 g
 * - 1,5 Stück
 */
export function formatFoodAmount(item, amount, digits = 1) {
  return `${fmtDisplay(amount, digits)} ${foodUnit(item)}`;
}

/**
 * Normalisiert KE/BE-Auswahl.
 */
export function normalizeDisplayUnit(unit) {
  return String(unit).trim().toUpperCase() === 'BE' ? 'BE' : 'KE';
}

/**
 * Liefert die KH-Gramm pro Anzeigeeinheit.
 * KE = 10 g KH
 * BE = 12 g KH
 */
export function gramsPerDisplayUnit(unit) {
  return normalizeDisplayUnit(unit) === 'BE' ? 12 : 10;
}

/**
 * Label für IE-Faktor.
 * factor = Gramm KH pro 1 IE
 */
export function formatFactorLabel(factor, digits = 1) {
  return `${fmtDisplay(factor, digits)} g KH / 1 IE`;
}

/**
 * Prüft, ob ein Wert als sinnvolle positive Eingabe taugt.
 */
export function isPositiveNumber(value) {
  return toNum(value) > 0;
}

/**
 * Liefert eine sichere, nichtnegative Menge.
 */
export function safeAmount(value) {
  return Math.max(0, toNum(value));
}
