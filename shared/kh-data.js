// shared/kh-data.js

import { toNum } from './kh-format.js';

const STORAGE_KEY = 'kh_rechner_bank_v1';

/**
 * Flexibler CSV-Parser:
 * - Trenner: ; oder ,
 * - unterstützt Quotes
 * - erste Zeile = Header
 * - leere Zeilen werden ignoriert
 */
export function parseCSVFlexible(text) {
  const src = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = src.split('\n').filter(line => line.trim() !== '');
  if (!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map(line => parseCSVLine(line, delimiter));

  if (!rows.length) return [];

  const header = rows[0].map(h => String(h ?? '').trim());
  const out = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const obj = {};

    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      if (!key) continue; // leere Header-Spalten ignorieren
      obj[key] = String(cells[j] ?? '').trim();
    }

    // komplett leere Datensätze überspringen
    const hasContent = Object.values(obj).some(v => String(v).trim() !== '');
    if (hasContent) out.push(obj);
  }

  return out;
}

export function filterBankByCategory(bank, category) {
  const c = String(category ?? '').trim();
  if (!c || c === 'Alle') return [...(bank || [])];

  return (bank || []).filter(item => String(item?.cat ?? '').trim() === c);
}

function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

/**
 * Mapped rohe CSV-Zeilen in ein einheitliches BANK-Format.
 *
 * Erwartete Felder aus deiner CSV:
 * - sort_id
 * - cat
 * - name
 * - emoji
 * - unit_kind
 * - g_per_1ke
 * - portion_name
 * - portion_count
 * - portion_amount
 * - portion_ke
 * - portion_carbs_g
 * - info
 */
export function mapRowsToBank(rows) {
  return (rows || [])
    .map((row, index) => mapRowToItem(row, index))
    .filter(Boolean);
}

function mapRowToItem(row, index) {
  const name = pick(row, ['name', 'lebensmittel', 'food', 'titel']).trim();
  if (!name) return null;

  const portionKE = toNum(pick(row, ['portion_ke', 'portion_kh_einheiten', 'ke']));
  let portionCarbsG = toNum(
    pick(row, ['portion_carbs_g', 'portion_kh_g', 'carbs_g', 'kh_g'])
  );

  // Fallback: aus portion_ke ableiten
  if (portionCarbsG <= 0 && portionKE > 0) {
    portionCarbsG = portionKE * 10;
  }

  const item = {
    id:
      pick(row, ['id']).trim() ||
      pick(row, ['sort_id']).trim() ||
      makeSlug(name, index),

    sort_id: toNum(pick(row, ['sort_id', 'sort', 'nr'])) || index + 1,
    cat: pick(row, ['cat', 'kategorie', 'category']).trim() || 'Allgemein',
    name,
    emoji: pick(row, ['emoji', 'icon']).trim() || '',
    unit_kind: normalizeUnitKind(pick(row, ['unit_kind', 'unit', 'einheit'])),
    g_per_1ke: toNum(pick(row, ['g_per_1ke', 'g_pro_1ke'])),
    portion_name: pick(row, ['portion_name', 'portion', 'portion_label']).trim(),
    portion_count: toNum(pick(row, ['portion_count', 'anzahl'])),
    portion_amount: toNum(pick(row, ['portion_amount', 'portion_menge', 'menge'])),
    portion_ke: portionKE,
    portion_carbs_g: portionCarbsG,
    info: pick(row, ['info', 'hinweis', 'notiz']).trim()
  };

  return item;
}

function pick(row, keys) {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) {
      return String(row[key] ?? '');
    }
  }
  return '';
}

function makeSlug(name, index = 0) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') + '-' + (index + 1);
}

function normalizeUnitKind(value) {
  const v = String(value ?? '').trim().toLowerCase();

  switch (v) {
    case 'g':
    case 'gramm':
    case 'gram':
      return 'g';

    case 'ml':
    case 'milliliter':
      return 'ml';

    case 'piece':
    case 'stück':
    case 'stueck':
      return 'piece';

    case 'slice':
    case 'scheibe':
      return 'slice';

    case 'tbsp':
    case 'el':
    case 'esslöffel':
    case 'essloeffel':
      return 'tbsp';

    case 'tsp':
    case 'tl':
    case 'teelöffel':
    case 'teeloeffel':
      return 'tsp';

    case 'cup':
    case 'tasse':
      return 'cup';

    case 'glass':
    case 'glas':
      return 'glass';

    default:
      return v || '';
  }
}

/**
 * Sortiert BANK standardmäßig nach sort_id, dann Name.
 */
export function sortBank(bank) {
  return [...(bank || [])].sort((a, b) => {
    const sa = toNum(a?.sort_id);
    const sb = toNum(b?.sort_id);
    if (sa !== sb) return sa - sb;
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'de');
  });
}

/**
 * Speichert BANK lokal.
 */
export function saveBank(bank, storageKey = STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(bank || []));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lädt BANK lokal.
 */
export function loadBank(storageKey = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Löscht lokalen Cache.
 */
export function clearBankCache(storageKey = STORAGE_KEY) {
  try {
    localStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * CSV-Text direkt in BANK umwandeln.
 */
export function csvTextToBank(csvText) {
  const rows = parseCSVFlexible(csvText);
  const bank = mapRowsToBank(rows);
  return sortBank(bank);
}

/**
 * Lädt CSV-Daten für Web oder APK.
 *
 * Reihenfolge:
 * 1) window.ANDROID_CSVS[fileName]
 * 2) fetch(fileName)
 * 3) optional Cache-Fallback
 */
export async function loadRepoPool(fileName = 'ke_fragepool.csv', { useCacheFallback = true } = {}) {
  // APK / WebView Injection
  const androidCSVs = globalThis?.ANDROID_CSVS;
  if (androidCSVs && typeof androidCSVs === 'object' && typeof androidCSVs[fileName] === 'string') {
    const bank = csvTextToBank(androidCSVs[fileName]);
    if (bank.length) saveBank(bank);
    return bank;
  }

  // Normales Web-Fetch
  try {
    const res = await fetch(fileName, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`CSV konnte nicht geladen werden: ${res.status}`);
    }
    const text = await res.text();
    const bank = csvTextToBank(text);
    if (bank.length) saveBank(bank);
    return bank;
  } catch (err) {
    if (useCacheFallback) {
      const cached = loadBank();
      if (cached.length) return sortBank(cached);
    }
    throw err;
  }
}

/**
 * Einfache Suche für den Rechner.
 */
export function searchBank(bank, query) {
  const q = String(query ?? '').trim().toLowerCase();
  const src = bank || [];

  if (!q) return sortBank(src);

  return src.filter(item => {
    const hay = [
      item.name,
      item.cat,
      item.info,
      item.portion_name,
      item.emoji
    ]
      .join(' ')
      .toLowerCase();

    return hay.includes(q);
  });
}

/**
 * Ein Lebensmittel per ID holen.
 */
export function getItemById(bank, id) {
  const wanted = String(id ?? '').trim();
  return (bank || []).find(item => String(item?.id ?? '') === wanted) || null;
}

/**
 * Kategorien extrahieren.
 */
export function getCategories(bank) {
  return Array.from(
    new Set(
      (bank || [])
        .map(item => String(item?.cat ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'de'));
}

export { STORAGE_KEY };
