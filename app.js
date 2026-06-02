const DEFAULT_CONFIG = {
  storeName: 'display-app.v1.7',
  dataSource: '',
  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  shelfCodeField: 'shelfcode',
  statusField: 'status',
  activeStatusValue: '1',
  inactiveStatusValue: '2',
  storeMapImage: 'store-map.png',
  defaultSort: 'name-asc'
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.STORE_DISPLAY_CONFIG || {})
};


const STORE_DOTS = [
  { id: 'D400', x: 75.57, y: 5.95 },
  { id: 'D500', x: 71.37, y: 10.13 },
  { id: 'D300', x: 80.27, y: 10.13 },
  { id: 'D900', x: 62.0, y: 10.13 },
  { id: 'E100', x: 49.33, y: 19.14 },
  { id: 'D200', x: 80.25, y: 20.75 },
  { id: 'D100', x: 80.39, y: 29.07 },
  { id: 'D600', x: 71.47, y: 29.08 },
  { id: 'D800', x: 61.98, y: 29.09 },
  { id: 'F400', x: 16.58, y: 29.97 },
  { id: 'F300', x: 28.85, y: 29.98 },
  { id: 'E200', x: 45.19, y: 29.98 },
  { id: 'D700', x: 66.68, y: 32.89 },
  { id: 'F500', x: 16.63, y: 38.97 },
  { id: 'F200', x: 28.88, y: 38.98 },
  { id: 'C700', x: 71.56, y: 40.45 },
  { id: 'E300', x: 45.18, y: 41.0 },
  { id: 'B100', x: 71.55, y: 45.34 },
  { id: 'C600', x: 61.85, y: 45.35 },
  { id: 'A600', x: 83.44, y: 45.35 },
  { id: 'F700', x: 16.62, y: 50.47 },
  { id: 'F100', x: 28.87, y: 50.47 },
  { id: 'E400', x: 45.22, y: 50.93 },
  { id: 'A500', x: 83.46, y: 55.02 },
  { id: 'C500', x: 61.91, y: 55.03 },
  { id: 'B200', x: 71.73, y: 55.04 },
  { id: 'G100', x: 20.03, y: 63.28 },
  { id: 'G200', x: 32.28, y: 63.29 },
  { id: 'I400', x: 33.43, y: 67.63 },
  { id: 'K400', x: 14.97, y: 67.63 },
  { id: 'J100', x: 25.02, y: 67.64 },
  { id: 'H100', x: 48.37, y: 67.64 },
  { id: 'A400', x: 83.46, y: 67.65 },
  { id: 'B300', x: 71.66, y: 67.65 },
  { id: 'C400', x: 62.18, y: 67.66 },
  { id: 'J200', x: 25.0, y: 75.2 },
  { id: 'K300', x: 14.98, y: 75.2 },
  { id: 'I300', x: 33.45, y: 75.21 },
  { id: 'H200', x: 48.37, y: 75.21 },
  { id: 'C300', x: 62.07, y: 75.21 },
  { id: 'B400', x: 71.63, y: 75.22 },
  { id: 'A300', x: 83.45, y: 75.23 },
  { id: 'A200', x: 83.47, y: 84.21 },
  { id: 'C200', x: 62.1, y: 84.21 },
  { id: 'B500', x: 71.67, y: 84.21 },
  { id: 'K200', x: 14.98, y: 84.21 },
  { id: 'J300', x: 25.05, y: 84.21 },
  { id: 'I200', x: 33.46, y: 84.21 },
  { id: 'H300', x: 48.39, y: 84.22 },
  { id: 'J400', x: 25.0, y: 93.2 },
  { id: 'B600', x: 71.71, y: 93.21 },
  { id: 'H400', x: 48.37, y: 93.21 },
  { id: 'K100', x: 14.98, y: 93.21 },
  { id: 'A100', x: 83.46, y: 93.21 },
  { id: 'C100', x: 62.07, y: 93.22 },
  { id: 'I100', x: 33.45, y: 93.22 }
];

const STORE_DOT_IDS = new Set(STORE_DOTS.map((dot) => dot.id));

const els = {
  storeName: document.querySelector('#store-name'),
  totalProducts: document.querySelector('#total-products'),
  totalCategories: document.querySelector('#total-categories'),
  averagePrice: document.querySelector('#average-price'),
  searchInput: document.querySelector('#search-input'),
  categoryFilter: document.querySelector('#category-filter'),
  brandFilter: document.querySelector('#brand-filter'),
  sortSelect: document.querySelector('#sort-select'),
  clearFilters: document.querySelector('#clear-filters'),
  resultCount: document.querySelector('#result-count'),
  dataSourceLabel: document.querySelector('#data-source-label'),
  categoryChips: document.querySelector('#category-chips'),
  productGrid: document.querySelector('#product-grid'),
  emptyState: document.querySelector('#empty-state'),
  fileInput: document.querySelector('#csv-file-input'),
  downloadCsv: document.querySelector('#download-csv'),
  dialog: document.querySelector('#product-dialog'),
  dialogClose: document.querySelector('#dialog-close'),
  productDetails: document.querySelector('#product-details'),
  cardTemplate: document.querySelector('#product-card-template'),
  barcodeLookup: document.querySelector('#barcode-lookup'),
  lookupBarcode: document.querySelector('#lookup-barcode'),
  startScanner: document.querySelector('#start-scanner'),
  stopScanner: document.querySelector('#stop-scanner'),
  scannerReader: document.querySelector('#scanner-reader'),
  scannerStatus: document.querySelector('#scanner-status')
};

const collator = new Intl.Collator(CONFIG.locale || undefined, {
  numeric: true,
  sensitivity: 'base'
});

const priceFormatter = new Intl.NumberFormat(CONFIG.locale || undefined, {
  style: 'currency',
  currency: CONFIG.currency || 'ISK',
  maximumFractionDigits: CONFIG.currency === 'ISK' ? 0 : 2
});

let products = [];
let currentRows = [];
let currentHeaders = [];
let productRouteMap = new Map();
let productBarcodeMap = new Map();
let activeSourceName = CONFIG.dataSource || 'No CSV loaded';
let csvDirty = false;
let lastFocusedBeforeProduct = null;
let barcodeDetector = null;
let scannerStream = null;
let scannerVideo = null;
let scannerFrameRequest = 0;
let scannerRunning = false;
let lastScannerText = '';
let lastScannerAt = 0;

init();

async function init() {
  els.storeName.textContent = CONFIG.storeName;
  applyDefaultSort();
  bindEvents();
  resetSummary();
  await loadInitialData();
}

function bindEvents() {
  els.searchInput.addEventListener('input', render);
  els.categoryFilter.addEventListener('change', render);
  els.brandFilter.addEventListener('change', render);
  els.sortSelect.addEventListener('change', render);
  els.clearFilters.addEventListener('click', clearFilters);
  els.downloadCsv.addEventListener('click', downloadCurrentCsv);
  els.lookupBarcode.addEventListener('click', () => lookupBarcodeAndOpen(els.barcodeLookup.value, { fromScanner: false }));
  els.barcodeLookup.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      lookupBarcodeAndOpen(els.barcodeLookup.value, { fromScanner: false });
    }
  });
  els.startScanner.addEventListener('click', startBarcodeScanner);
  els.stopScanner.addEventListener('click', stopBarcodeScanner);

  els.fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCsvWithHeaders(text);
      setProducts(parsed.rows, file.name, parsed.headers, { dirty: false });
      updateScannerStatus(`Loaded ${products.length} products from ${file.name}. Scan or enter a barcode.`);
    } catch (error) {
      showError(`Could not read CSV file: ${error.message}`);
    }
  });

  els.dialogClose.addEventListener('click', () => closeProductOverlay({ clearHash: true }));
  els.dialog.addEventListener('click', (event) => {
    if (event.target === els.dialog) {
      closeProductOverlay({ clearHash: true });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isProductOverlayOpen()) {
      event.preventDefault();
      closeProductOverlay({ clearHash: true });
    }
  });

  window.addEventListener('hashchange', openProductFromHash);
}

async function loadInitialData() {
  if (!CONFIG.dataSource) {
    setProducts([], 'No CSV loaded', [], { dirty: false });
    els.resultCount.textContent = 'Upload a CSV file to load products.';
    els.dataSourceLabel.textContent = 'Source: no CSV loaded';
    updateScannerStatus('Upload a CSV file, then scan or enter a barcode.');
    return;
  }

  try {
    const response = await fetch(CONFIG.dataSource, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading ${CONFIG.dataSource}`);
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('json') || CONFIG.dataSource.toLowerCase().includes('.json');

    if (isJson) {
      const rows = normalizeJsonPayload(JSON.parse(text));
      setProducts(rows, CONFIG.dataSource, collectHeaders(rows), { dirty: false });
    } else {
      const parsed = parseCsvWithHeaders(text);
      setProducts(parsed.rows, CONFIG.dataSource, parsed.headers, { dirty: false });
    }

    updateScannerStatus(`Loaded ${products.length} products. Scan or enter a barcode.`);
  } catch (error) {
    showError(`Could not load product data. ${error.message}`);
    updateScannerStatus('Could not load product data. Upload a CSV file, then scan or enter a barcode.');
  }
}

function normalizeJsonPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.items)) return payload.items;
  }
  throw new Error('JSON must be an array, or an object with products/data/rows/items.');
}

function setProducts(rows, sourceName, headers = [], options = {}) {
  activeSourceName = sourceName;
  currentRows = rows.map((row) => ({ ...(row && typeof row === 'object' ? row : { value: row }) }));
  currentHeaders = normalizeHeaders(headers.length ? headers : collectHeaders(currentRows));

  products = currentRows
    .map((row, index) => normalizeProduct(row, index))
    .filter((product) => product.name);

  productRouteMap = new Map();
  productBarcodeMap = new Map();

  products.forEach((product) => {
    if (!productRouteMap.has(product.routeKey)) {
      productRouteMap.set(product.routeKey, product);
    }

    product.barcodeAliases.forEach((alias) => {
      const key = alias.toLowerCase();
      if (!productBarcodeMap.has(key)) productBarcodeMap.set(key, product);
      if (!productRouteMap.has(key)) productRouteMap.set(key, product);
    });
  });

  csvDirty = Boolean(options.dirty);
  els.downloadCsv.disabled = products.length === 0;

  buildFilterOptions();
  renderSummary();
  render();
  openProductFromHash();
}

function parseCsvWithHeaders(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const table = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const next = cleanText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) table.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) table.push(row);

  if (table.length < 1) return { headers: [], rows: [] };

  const headers = table[0].map((header) => cleanHeader(header));
  const rows = table.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? '';
    });
    return item;
  });

  return { headers, rows };
}

function cleanHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

function normalizeHeaders(headers) {
  const cleaned = uniqueStrings(headers.map(cleanHeader));
  const required = [CONFIG.priceField, CONFIG.barcodeField, CONFIG.imageField, CONFIG.shelfCodeField, CONFIG.statusField, 'name', 'weight', 'brand'];
  required.forEach((header) => {
    if (header && !cleaned.some((existing) => existing.toLowerCase() === String(header).toLowerCase())) {
      cleaned.push(header);
    }
  });
  return cleaned;
}

function collectHeaders(rows) {
  const headers = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!headers.some((header) => header.toLowerCase() === key.toLowerCase())) {
        headers.push(key);
      }
    });
  });
  return headers;
}

function normalizeProduct(row, index) {
  const sourceRow = row && typeof row === 'object' ? row : { value: row };
  const name = getField(sourceRow, ['name', 'product_name', 'title']);
  const brand = getField(sourceRow, ['brand', 'manufacturer']) || 'No brand';
  const barcodeValues = collectBarcodeValues(sourceRow);
  const barcode = barcodeValues[0] || '';
  const barcodeAliases = buildBarcodeAliases(barcodeValues);
  const costRaw = getField(sourceRow, [CONFIG.priceField, 'price', 'regular_price']);
  const price = parsePrice(costRaw);
  const category = getField(sourceRow, ['store_categories', 'store_category', 'category']) || 'Uncategorized';
  const categories = getField(sourceRow, ['categories', 'category_path']);
  const ingredients = getField(sourceRow, ['ingredients', 'description']);
  const weight = getField(sourceRow, ['weight', 'package_weight', 'size']);
  const rawStatus = getField(sourceRow, [CONFIG.statusField, 'status']);
  const status = normalizeStatusCode(rawStatus);
  if (!rawStatus.trim()) {
    setField(sourceRow, CONFIG.statusField, ['status'], status);
  }
  const shelfCode = normalizeShelfCode(getField(sourceRow, [CONFIG.shelfCodeField, 'shelf_code', 'shelf', 'shelf_location', 'store_location', 'location']));
  const imageUrl = normalizeImageUrl(getField(sourceRow, [CONFIG.imageField, 'image', 'image_url', 'img_url']));
  const idBase = barcode || `${name}-${index + 1}`;
  const routeKey = slugify(idBase || `product-${index + 1}`);

  return {
    id: `${routeKey}-${index + 1}`,
    routeKey,
    rowNumber: index + 2,
    rowIndex: index,
    sourceRow,
    name: name.trim(),
    brand: brand.trim(),
    barcode: barcode.trim(),
    barcodeAliases,
    price,
    priceRaw: costRaw.trim(),
    category: category.trim(),
    categories: categories.trim(),
    ingredients: ingredients.trim(),
    weight: weight.trim(),
    status: status.trim(),
    shelfCode,
    imageUrl,
    searchText: [name, brand, barcode, barcodeAliases.join(' '), category, categories, ingredients, weight, shelfCode, status, getStatusLabel(status)]
      .join(' ')
      .toLocaleLowerCase(CONFIG.locale || undefined)
  };
}

function collectBarcodeValues(row) {
  const candidateKeys = [
    CONFIG.barcodeField,
    'barcodex',
    'barcode',
    'barcode_number',
    'product_barcode',
    'gtin',
    'gtin14',
    'ean',
    'ean13',
    'upc',
    'sku'
  ];

  const values = [];
  candidateKeys.forEach((key) => {
    const value = getField(row, [key]);
    if (value) values.push(value);
  });

  Object.keys(row).forEach((key) => {
    const normalized = normalizeKey(key);
    const looksLikeBarcode = normalized.includes('barcode') || normalized === 'gtin' || normalized === 'ean' || normalized === 'ean13';
    if (looksLikeBarcode && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      values.push(String(row[key]));
    }
  });

  return uniqueStrings(values);
}

function buildBarcodeAliases(values) {
  const list = Array.isArray(values) ? values : [values];
  const aliases = new Set();

  list.forEach((value) => {
    addBarcodeAliasVariants(value, aliases);

    const parsed = parseBarcodeForProductLookup(value);
    addBarcodeAliasVariants(parsed.original_barcode, aliases);
    addBarcodeAliasVariants(parsed.barcode, aliases);
    if (parsed.gs1_ai_01) addBarcodeAliasVariants(parsed.gs1_ai_01, aliases);
  });

  return [...aliases].filter(Boolean);
}

function addBarcodeAliasVariants(value, aliases) {
  const text = normalizeScannedText(value);
  const compact = getCompactDigits(text);
  const alnum = text.replace(/[^0-9A-Za-z]/g, '');

  [text, compact, alnum].forEach((candidate) => {
    const clean = String(candidate || '').trim();
    if (clean) aliases.add(clean.toLowerCase());
  });

  if (/^\d{14}$/.test(compact) && compact.startsWith('0')) {
    aliases.add(compact.slice(1));
  }

  if (/^\d{13}$/.test(compact)) {
    aliases.add(`0${compact}`);
  }

  if (/^\d{12}$/.test(compact)) {
    aliases.add(`0${compact}`);
    aliases.add(`00${compact}`);
  }
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getField(row, keys) {
  for (const key of keys) {
    if (!key) continue;
    const exact = row[key];
    if (exact !== undefined && exact !== null && String(exact).trim() !== '') return String(exact);

    const lowerKey = String(key).toLowerCase();
    const foundKey = Object.keys(row).find((rowKey) => rowKey.toLowerCase() === lowerKey);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return String(row[foundKey]);
    }
  }
  return '';
}

function setField(row, preferredKey, fallbackKeys, value) {
  const keys = [preferredKey, ...(fallbackKeys || [])].filter(Boolean);
  const foundKey = keys
    .map((key) => Object.keys(row).find((rowKey) => rowKey.toLowerCase() === String(key).toLowerCase()))
    .find(Boolean);
  const targetKey = foundKey || preferredKey || 'price';
  row[targetKey] = value;
  if (!currentHeaders.some((header) => header.toLowerCase() === targetKey.toLowerCase())) {
    currentHeaders.push(targetKey);
  }
}

function parsePrice(value) {
  const cleaned = String(value || '')
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceForCsv(value) {
  if (!Number.isFinite(value)) return '';
  return CONFIG.currency === 'ISK' ? String(Math.round(value)) : String(value.toFixed(2));
}

function normalizeImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

function buildFilterOptions() {
  const categories = countBy(products.map((product) => product.category || 'Uncategorized'));
  const brands = countBy(products.map((product) => product.brand || 'No brand'));

  populateSelect(els.categoryFilter, categories, 'All categories');
  populateSelect(els.brandFilter, brands, 'All brands');
  renderCategoryChips(categories);
}

function countBy(values) {
  const counts = new Map();
  values.forEach((value) => {
    const label = String(value || '').trim() || 'Uncategorized';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => collator.compare(a[0], b[0]));
}

function populateSelect(select, values, allLabel) {
  const currentValue = select.value;
  select.replaceChildren();
  select.append(new Option(allLabel, 'all'));
  values.forEach(([label, count]) => {
    select.append(new Option(`${label} (${count})`, label));
  });

  if ([...select.options].some((option) => option.value === currentValue)) {
    select.value = currentValue;
  }
}

function renderCategoryChips(categories) {
  els.categoryChips.replaceChildren();

  const allChip = createChip('All', 'all', products.length);
  els.categoryChips.append(allChip);

  categories.forEach(([label, count]) => {
    els.categoryChips.append(createChip(label, label, count));
  });
}

function createChip(label, value, count) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = `${label} (${count})`;
  chip.setAttribute('aria-pressed', els.categoryFilter.value === value ? 'true' : 'false');
  chip.addEventListener('click', () => {
    els.categoryFilter.value = value;
    render();
  });
  return chip;
}

function resetSummary() {
  els.totalProducts.textContent = '0';
  els.totalCategories.textContent = '0';
  els.averagePrice.textContent = '-';
  els.dataSourceLabel.textContent = 'Source: no CSV loaded';
}

function renderSummary() {
  const categories = new Set(products.map((product) => product.category).filter(Boolean));
  const validPrices = products.map((product) => product.price).filter((price) => Number.isFinite(price) && price > 0);
  const average = validPrices.length
    ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
    : null;

  els.totalProducts.textContent = String(products.length);
  els.totalCategories.textContent = String(categories.size);
  els.averagePrice.textContent = average === null ? '-' : formatPrice(average);
  els.dataSourceLabel.textContent = csvDirty ? `Source: ${activeSourceName} (edited locally)` : `Source: ${activeSourceName}`;
}

function render() {
  const filtered = getFilteredProducts();
  els.productGrid.replaceChildren();

  const fragment = document.createDocumentFragment();
  filtered.forEach((product) => fragment.append(renderProductCard(product)));
  els.productGrid.append(fragment);

  els.resultCount.textContent = `${filtered.length} of ${products.length} products shown`;
  els.emptyState.hidden = filtered.length > 0;
  updateChipState();
}

function getFilteredProducts() {
  const query = els.searchInput.value.trim().toLocaleLowerCase(CONFIG.locale || undefined);
  const selectedCategory = els.categoryFilter.value;
  const selectedBrand = els.brandFilter.value;
  const sortValue = els.sortSelect.value;

  const filtered = products.filter((product) => {
    const matchesQuery = !query || product.searchText.includes(query);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
    return matchesQuery && matchesCategory && matchesBrand;
  });

  return filtered.sort((a, b) => compareProducts(a, b, sortValue));
}

function compareProducts(a, b, sortValue) {
  switch (sortValue) {
    case 'price-asc':
      return comparePrices(a, b, 'asc') || collator.compare(a.name, b.name);
    case 'price-desc':
      return comparePrices(a, b, 'desc') || collator.compare(a.name, b.name);
    case 'brand-asc':
      return collator.compare(a.brand, b.brand) || collator.compare(a.name, b.name);
    case 'category-asc':
      return collator.compare(a.category, b.category) || collator.compare(a.name, b.name);
    case 'shelfcode-asc':
      return compareOptionalText(a.shelfCode, b.shelfCode) || collator.compare(a.name, b.name);
    case 'name-asc':
    default:
      return collator.compare(a.name, b.name);
  }
}

function comparePrices(a, b, direction) {
  const aPrice = Number.isFinite(a.price) && a.price > 0 ? a.price : Number.POSITIVE_INFINITY;
  const bPrice = Number.isFinite(b.price) && b.price > 0 ? b.price : Number.POSITIVE_INFINITY;
  return direction === 'asc' ? aPrice - bPrice : bPrice - aPrice;
}

function compareOptionalText(aValue, bValue) {
  const aText = String(aValue || '').trim();
  const bText = String(bValue || '').trim();
  if (aText && !bText) return -1;
  if (!aText && bText) return 1;
  return collator.compare(aText, bText);
}

function renderProductCard(product) {
  const fragment = els.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.product-card');
  const link = fragment.querySelector('.product-card__image-link');
  const image = fragment.querySelector('.product-card__image');
  const imageFallback = fragment.querySelector('.product-card__image-fallback');
  const category = fragment.querySelector('.product-card__category');
  const barcode = fragment.querySelector('.product-card__barcode');
  const name = fragment.querySelector('.product-card__name');
  const brand = fragment.querySelector('.product-card__brand');
  const price = fragment.querySelector('.product-card__price');
  const weight = fragment.querySelector('.product-card__weight');
  const shelfCode = fragment.querySelector('.product-card__shelfcode');
  const button = fragment.querySelector('.product-card__button');

  const productUrl = `#/product/${encodeURIComponent(product.routeKey)}`;
  card.classList.toggle('is-inactive', !isProductActive(product));
  link.href = productUrl;
  setImageOrFallback(image, imageFallback, product.imageUrl, `${product.name} product image`);
  category.textContent = product.category || 'Uncategorized';
  barcode.textContent = product.barcode ? `#${product.barcode}` : `Row ${product.rowNumber}`;
  name.textContent = product.name;
  brand.textContent = product.brand;
  price.textContent = formatPriceLabel(product.price);
  price.classList.toggle('is-missing', !hasValidPrice(product));
  weight.textContent = product.weight || 'No weight';
  shelfCode.textContent = `${product.shelfCode ? `Shelf ${product.shelfCode}` : 'Shelf not set'} · ${getStatusLabel(product.status)}`;
  shelfCode.classList.toggle('is-inactive', !isProductActive(product));

  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigateToProduct(product);
  });

  button.addEventListener('click', () => navigateToProduct(product));
  card.dataset.productId = product.id;

  return fragment;
}

function updateChipState() {
  els.categoryChips.querySelectorAll('.chip').forEach((chip) => {
    const expectedPrefix = `${els.categoryFilter.value} (`;
    const isAll = els.categoryFilter.value === 'all' && chip.textContent.startsWith('All (');
    chip.setAttribute('aria-pressed', isAll || chip.textContent.startsWith(expectedPrefix) ? 'true' : 'false');
  });
}

function navigateToProduct(product) {
  const targetHash = `#/product/${encodeURIComponent(product.routeKey)}`;
  if (location.hash === targetHash) {
    openProduct(product);
  } else {
    location.hash = targetHash;
  }
}

function openProductFromHash() {
  if (!location.hash.startsWith('#/product/')) {
    if (isProductOverlayOpen()) {
      closeProductOverlay({ clearHash: false });
    }
    return;
  }

  const rawKey = location.hash.replace('#/product/', '');
  const key = decodeURIComponent(rawKey).toLowerCase();
  const product = productRouteMap.get(key);

  if (product) {
    openProduct(product);
  } else if (isProductOverlayOpen()) {
    closeProductOverlay({ clearHash: false });
  }
}

function isProductOverlayOpen() {
  return Boolean(els.dialog && !els.dialog.hidden);
}

function openProductOverlay() {
  if (!els.dialog) return;

  if (els.dialog.hidden) {
    lastFocusedBeforeProduct = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  els.dialog.hidden = false;
  els.dialog.classList.add('is-open');
  els.dialog.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('product-overlay-open');
  document.body.classList.add('product-overlay-open');
}

function closeProductOverlay({ clearHash = false } = {}) {
  if (!els.dialog || els.dialog.hidden) return;

  els.dialog.classList.remove('is-open');
  els.dialog.hidden = true;
  els.dialog.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('product-overlay-open');
  document.body.classList.remove('product-overlay-open');

  if (clearHash && location.hash.startsWith('#/product/')) {
    history.pushState('', document.title, `${location.pathname}${location.search}`);
  }

  if (lastFocusedBeforeProduct && typeof lastFocusedBeforeProduct.focus === 'function') {
    try {
      lastFocusedBeforeProduct.focus({ preventScroll: true });
    } catch (error) {
      lastFocusedBeforeProduct.focus();
    }
  }

  lastFocusedBeforeProduct = null;
}

function resetProductDialogScroll() {
  if (!els.dialog) return;

  els.dialog.scrollTop = 0;
  els.dialog.scrollLeft = 0;

  if (typeof els.dialog.scrollTo === 'function') {
    try {
      els.dialog.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (error) {
      els.dialog.scrollTo(0, 0);
    }
  }

  if (els.productDetails) {
    els.productDetails.scrollTop = 0;
    els.productDetails.scrollLeft = 0;

    if (typeof els.productDetails.scrollTo === 'function') {
      try {
        els.productDetails.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch (error) {
        els.productDetails.scrollTo(0, 0);
      }
    }
  }
}

function openProduct(product) {
  els.productDetails.innerHTML = renderProductDetails(product);

  const detailImage = els.productDetails.querySelector('.product-details__image');
  const detailFallback = els.productDetails.querySelector('.product-details__image-fallback');
  setImageOrFallback(detailImage, detailFallback, product.imageUrl, `${product.name} product image`);

  const copyBarcodeButton = els.productDetails.querySelector('[data-action="copy-barcode"]');
  const copyLinkButton = els.productDetails.querySelector('[data-action="copy-link"]');
  const priceForm = els.productDetails.querySelector('[data-price-form]');
  const statusEditor = els.productDetails.querySelector('[data-status-editor]');
  const toggleStatusButton = els.productDetails.querySelector('[data-action="toggle-status"]');
  const shelfMap = els.productDetails.querySelector('[data-shelf-map]');
  const shelfForm = els.productDetails.querySelector('[data-shelf-form]');
  const clearShelfCodeButton = els.productDetails.querySelector('[data-action="clear-shelfcode"]');
  setupStoreMapImage(shelfMap);

  copyBarcodeButton?.addEventListener('click', async () => {
    await copyText(product.barcode || product.name, copyBarcodeButton, 'Copied barcode');
  });

  copyLinkButton?.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}${location.search}#/product/${encodeURIComponent(product.routeKey)}`;
    await copyText(url, copyLinkButton, 'Copied link');
  });

  priceForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProductPrice(product, priceForm);
  });

  toggleStatusButton?.addEventListener('click', () => toggleProductStatus(product, statusEditor));

  shelfMap?.querySelectorAll('[data-shelf-dot]').forEach((button) => {
    button.addEventListener('click', () => selectShelfCodeOnMap(button.dataset.shelfDot, shelfMap));
  });

  shelfForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProductShelfCode(product, shelfMap?.dataset.pendingShelfcode || '', shelfMap);
  });

  clearShelfCodeButton?.addEventListener('click', () => clearProductShelfCode(product, shelfMap));

  openProductOverlay();
  resetProductDialogScroll();
  requestAnimationFrame(() => {
    resetProductDialogScroll();
    els.dialogClose?.focus({ preventScroll: true });
    setTimeout(resetProductDialogScroll, 0);
  });
}

function renderProductDetails(product) {
  const productLink = `#/product/${encodeURIComponent(product.routeKey)}`;
  const ingredients = product.ingredients || 'No ingredients text in the data yet.';
  const fullCategory = product.categories || product.category || 'No category path';
  const priceValue = Number.isFinite(product.price) && product.price > 0 ? product.price : '';
  const active = isProductActive(product);
  const statusDisplay = getStatusDisplay(product.status);
  const statusButtonText = active ? 'Deactivate product locally' : 'Activate product locally';
  const statusButtonClass = active ? 'button button--danger' : 'button button--success';
  const imageMarkup = `
    <img class="product-details__image" alt="${escapeAttribute(product.name)} product image" />
    <div class="product-details__image-fallback" hidden>No image</div>
  `;

  return `
    <section class="product-detail-main" aria-label="Main product details">
      <header class="product-detail-hero-header">
        <div class="product-detail-title">
          <span class="badge">${escapeHtml(product.category || 'Uncategorized')}</span>
          <h2 class="product-detail-name">${escapeHtml(product.name)}</h2>
          <p class="product-detail-brand">${escapeHtml(product.brand || 'No brand')}</p>
        </div>
        <span class="status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}" data-status-pill>${escapeHtml(statusDisplay)}</span>
      </header>

      <div class="detail-price ${hasValidPrice(product) ? '' : 'product-card__price is-missing'}" data-current-price>
        ${escapeHtml(formatPriceLabel(product.price))}
      </div>

      <div class="product-detail-photo-frame">
        ${imageMarkup}
      </div>
    </section>

    <aside class="product-detail-actions" aria-label="Product actions">
      <div class="actions-stack">
        <form class="price-edit edit-card action-card" data-price-form>
          <div class="edit-card__header">
            <span class="action-number">1</span>
            <div>
              <strong>Change price</strong>
              <p>Update the local CSV price for this product.</p>
            </div>
          </div>
          <label>
            <span>New price</span>
            <input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeAttribute(priceValue)}" placeholder="Enter new price" />
          </label>
          <button class="button" type="submit">Update price locally</button>
          <small data-price-status>Download the updated CSV to make the change permanent.</small>
        </form>

        <section class="status-editor edit-card action-card" data-status-editor>
          <div class="edit-card__header">
            <span class="action-number">2</span>
            <div>
              <strong>Change status</strong>
              <p>Current status: <span data-current-status>${escapeHtml(statusDisplay)}</span></p>
            </div>
          </div>
          <button class="${statusButtonClass}" type="button" data-action="toggle-status">${escapeHtml(statusButtonText)}</button>
          <small data-status-message>Status 1 = activated. Status 2 = deactivated. Download the updated CSV to keep the change.</small>
        </section>

        <section class="shelfcode-editor edit-card action-card" data-shelf-map data-current-shelfcode-value="${escapeAttribute(product.shelfCode || '')}" data-pending-shelfcode="${escapeAttribute(product.shelfCode || '')}">
          <div class="shelfcode-editor__header edit-card__header">
            <span class="action-number">3</span>
            <div>
              <strong>Change shelfcode</strong>
              <p>Current shelfcode: <span data-current-shelfcode>${escapeHtml(product.shelfCode || 'Not set')}</span></p>
              <p>Selected on map: <span data-selected-shelfcode>${escapeHtml(product.shelfCode || 'None selected')}</span></p>
            </div>
          </div>
          <div class="store-map" role="application" aria-label="Store shelfcode map">
            <img class="store-map__image" data-store-map-image alt="Store shelfcode map" />
            ${renderShelfCodeDots(product.shelfCode, product.shelfCode)}
          </div>
          <form class="shelfcode-actions" data-shelf-form>
            <button class="button" type="submit">Update shelfcode locally</button>
            <button class="button button--secondary" type="button" data-action="clear-shelfcode">Clear shelfcode locally</button>
          </form>
          <small class="shelfcode-editor__status" data-shelf-status>Tap a red dot, then click Update shelfcode locally.</small>
        </section>
      </div>
    </aside>

    <section class="product-detail-info" aria-label="Product information">
      <div class="info-section-header">
        <span class="eyebrow eyebrow--dark">Product information</span>
        <h3>Info</h3>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Status</span>
          <span data-detail-status>${escapeHtml(statusDisplay)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Weight</span>
          <span>${escapeHtml(product.weight || 'No weight')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Shelfcode</span>
          <span data-detail-shelfcode>${escapeHtml(product.shelfCode || 'Not set')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Barcode / GTIN</span>
          <span>${escapeHtml(product.barcode || 'No barcode')}</span>
        </div>
        ${detailItem('Brand', product.brand || 'No brand')}
        ${detailItem('Store category', product.category || 'Uncategorized')}
        ${detailItem('CSV row', String(product.rowNumber))}
        ${detailItem('Product link', productLink)}
      </div>

      <section class="ingredients-box">
        <strong>Ingredients</strong>
        <p>${escapeHtml(ingredients)}</p>
      </section>

      <section class="ingredients-box">
        <strong>Full category path</strong>
        <p>${escapeHtml(fullCategory)}</p>
      </section>

      <div class="detail-actions">
        <button class="button" type="button" data-action="copy-barcode">Copy barcode</button>
        <button class="button button--secondary" type="button" data-action="copy-link">Copy product link</button>
      </div>
    </section>
  `;
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function saveProductPrice(product, form) {
  const input = form.elements.price;
  const status = form.querySelector('[data-price-status]');
  const parsedPrice = parsePrice(input.value);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    status.textContent = 'Enter a valid price.';
    status.className = 'price-status price-status--error';
    return;
  }

  const formattedPrice = formatPriceForCsv(parsedPrice);
  setField(product.sourceRow, CONFIG.priceField, ['price', 'regular_price'], formattedPrice);
  product.price = parsedPrice;
  product.priceRaw = formattedPrice;
  updateProductSearchText(product);

  csvDirty = true;
  els.downloadCsv.disabled = false;
  status.textContent = `Price updated locally to ${formatPriceLabel(product.price)}. Download the CSV to publish the change.`;
  status.className = 'price-status price-status--success';

  const currentPrice = els.productDetails.querySelector('[data-current-price]');
  if (currentPrice) {
    currentPrice.textContent = formatPriceLabel(product.price);
    currentPrice.classList.toggle('is-missing', !hasValidPrice(product));
  }

  renderSummary();
  render();
}


function toggleProductStatus(product, container) {
  const nextStatus = isProductActive(product)
    ? String(CONFIG.inactiveStatusValue || '2')
    : String(CONFIG.activeStatusValue || '1');
  saveProductStatus(product, nextStatus, container);
}

function saveProductStatus(product, statusCode, container) {
  const normalizedStatus = normalizeStatusCode(statusCode);
  setField(product.sourceRow, CONFIG.statusField, ['status'], normalizedStatus);
  product.status = normalizedStatus;
  updateProductSearchText(product);

  csvDirty = true;
  els.downloadCsv.disabled = false;

  updateStatusEditorState(product, container);
  renderSummary();
  render();
}

function updateStatusEditorState(product, container) {
  const active = isProductActive(product);
  const display = getStatusDisplay(product.status);
  const current = container?.querySelector('[data-current-status]');
  const message = container?.querySelector('[data-status-message]');
  const button = container?.querySelector('[data-action="toggle-status"]');
  const pill = els.productDetails.querySelector('[data-status-pill]');
  const detailStatus = els.productDetails.querySelector('[data-detail-status]');

  if (current) current.textContent = display;
  if (detailStatus) detailStatus.textContent = display;
  if (message) {
    message.textContent = `Status updated locally to ${display}. Download the updated CSV to keep the change.`;
    message.className = 'status-message status-message--success';
  }
  if (button) {
    button.textContent = active ? 'Deactivate product locally' : 'Activate product locally';
    button.className = active ? 'button button--danger' : 'button button--success';
  }
  if (pill) {
    pill.textContent = display;
    pill.className = `status-pill ${active ? 'status-pill--active' : 'status-pill--inactive'}`;
  }
}


function setupStoreMapImage(container) {
  if (!container) return;
  const image = container.querySelector('[data-store-map-image]');
  const status = container.querySelector('[data-shelf-status]');
  if (!image) return;

  const configuredPath = String(CONFIG.storeMapImage || '').trim();
  const candidates = uniqueStrings([
    configuredPath,
    'store-map.png',
    './store-map.png',
    'assets/store-map.png'
  ]).filter(Boolean);

  let index = 0;

  const tryCandidate = () => {
    const nextPath = candidates[index];
    if (!nextPath) {
      image.hidden = true;
      container.classList.add('store-map--missing-image');
      if (status) {
        status.textContent = 'Store map image not found. Upload store-map.png in the repo root.';
        status.className = 'shelfcode-editor__status shelfcode-editor__status--error';
      }
      return;
    }
    image.hidden = false;
    image.src = nextPath;
  };

  image.addEventListener('load', () => {
    container.classList.remove('store-map--missing-image');
  });

  image.addEventListener('error', () => {
    index += 1;
    tryCandidate();
  });

  tryCandidate();
}

function renderShelfCodeDots(activeShelfCode, selectedShelfCode = activeShelfCode) {
  const active = normalizeShelfCode(activeShelfCode);
  const selected = normalizeShelfCode(selectedShelfCode);
  return STORE_DOTS.map((dot) => {
    const isActive = dot.id === active;
    const isSelected = dot.id === selected;
    const classes = ['map-dot', isActive ? 'active' : '', isSelected && !isActive ? 'selected' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${classes}" data-shelf-dot="${escapeAttribute(dot.id)}" title="${escapeAttribute(dot.id)}" aria-label="Select shelfcode ${escapeAttribute(dot.id)}" style="left: ${dot.x}%; top: ${dot.y}%;">${escapeHtml(dot.id)}</button>`;
  }).join('');
}

function normalizeShelfCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeStatusCode(value) {
  const raw = String(value ?? '').trim();
  const activeValue = String(CONFIG.activeStatusValue || '1');
  const inactiveValue = String(CONFIG.inactiveStatusValue || '2');
  const lower = raw.toLowerCase();

  if (!raw) return activeValue;
  if (raw === inactiveValue || lower === 'inactive' || lower === 'deactivated' || lower === 'disabled' || raw === '0') {
    return inactiveValue;
  }
  if (raw === activeValue || lower === 'active' || lower === 'activated' || lower === 'enabled') {
    return activeValue;
  }
  return raw;
}

function isProductActive(product) {
  return normalizeStatusCode(product?.status) !== String(CONFIG.inactiveStatusValue || '2');
}

function getStatusLabel(status) {
  const code = normalizeStatusCode(status);
  if (code === String(CONFIG.inactiveStatusValue || '2')) return 'Deactivated';
  if (code === String(CONFIG.activeStatusValue || '1')) return 'Active';
  return `Status ${code}`;
}

function getStatusDisplay(status) {
  const code = normalizeStatusCode(status);
  return `${getStatusLabel(code)} (${code})`;
}

function selectShelfCodeOnMap(rawShelfCode, container) {
  const shelfCode = normalizeShelfCode(rawShelfCode);
  const status = container?.querySelector('[data-shelf-status]');
  const selected = container?.querySelector('[data-selected-shelfcode]');

  if (!STORE_DOT_IDS.has(shelfCode)) {
    if (status) {
      status.textContent = 'Select a valid shelfcode from the map.';
      status.className = 'shelfcode-editor__status shelfcode-editor__status--error';
    }
    return;
  }

  if (container) container.dataset.pendingShelfcode = shelfCode;
  if (selected) selected.textContent = shelfCode;

  container?.querySelectorAll('[data-shelf-dot]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.shelfDot === shelfCode && !button.classList.contains('active'));
  });

  if (status) {
    status.textContent = `Selected ${shelfCode}. Click Update shelfcode locally to save this shelfcode.`;
    status.className = 'shelfcode-editor__status';
  }
}

function saveProductShelfCode(product, rawShelfCode, container) {
  const shelfCode = normalizeShelfCode(rawShelfCode);
  const status = container?.querySelector('[data-shelf-status]');

  if (!STORE_DOT_IDS.has(shelfCode)) {
    if (status) {
      status.textContent = 'Select a valid shelfcode from the map.';
      status.className = 'shelfcode-editor__status shelfcode-editor__status--error';
    }
    return;
  }

  setField(product.sourceRow, CONFIG.shelfCodeField, ['shelf_code', 'shelf', 'shelf_location', 'store_location', 'location'], shelfCode);
  product.shelfCode = shelfCode;
  updateProductSearchText(product);
  csvDirty = true;
  els.downloadCsv.disabled = false;

  updateShelfCodeEditorState(container, shelfCode);
  renderSummary();
  render();
}

function clearProductShelfCode(product, container) {
  setField(product.sourceRow, CONFIG.shelfCodeField, ['shelf_code', 'shelf', 'shelf_location', 'store_location', 'location'], '');
  product.shelfCode = '';
  updateProductSearchText(product);
  csvDirty = true;
  els.downloadCsv.disabled = false;

  updateShelfCodeEditorState(container, '');
  renderSummary();
  render();
}

function updateShelfCodeEditorState(container, shelfCode) {
  if (!container) return;
  const current = container.querySelector('[data-current-shelfcode]');
  const status = container.querySelector('[data-shelf-status]');
  const detailShelfCode = els.productDetails.querySelector('[data-detail-shelfcode]');
  const normalized = normalizeShelfCode(shelfCode);
  const selected = container.querySelector('[data-selected-shelfcode]');

  if (current) current.textContent = normalized || 'Not set';
  if (selected) selected.textContent = normalized || 'None selected';
  if (detailShelfCode) detailShelfCode.textContent = normalized || 'Not set';
  container.dataset.currentShelfcodeValue = normalized;
  container.dataset.pendingShelfcode = normalized;
  container.querySelectorAll('[data-shelf-dot]').forEach((button) => {
    button.classList.toggle('active', button.dataset.shelfDot === normalized);
    button.classList.toggle('selected', false);
  });

  if (status) {
    status.textContent = normalized
      ? `Shelfcode updated locally to ${normalized}. Download the updated CSV to keep it.`
      : 'Shelfcode cleared locally. Download the updated CSV to keep it.';
    status.className = 'shelfcode-editor__status shelfcode-editor__status--success';
  }
}

function updateProductSearchText(product) {
  product.searchText = [
    product.name,
    product.brand,
    product.barcode,
    product.barcodeAliases.join(' '),
    product.category,
    product.categories,
    product.ingredients,
    product.weight,
    product.shelfCode,
    product.status,
    getStatusLabel(product.status)
  ]
    .join(' ')
    .toLocaleLowerCase(CONFIG.locale || undefined);
}

function setImageOrFallback(image, fallback, imageUrl, altText) {
  if (!image) return;
  const cleanUrl = String(imageUrl || '').trim();

  if (!cleanUrl) {
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    if (fallback) fallback.hidden = false;
    return;
  }

  image.hidden = false;
  image.src = cleanUrl;
  image.alt = altText || 'Product image';
  if (fallback) fallback.hidden = true;
  image.onerror = () => {
    image.onerror = null;
    image.hidden = true;
    image.removeAttribute('src');
    if (fallback) fallback.hidden = false;
  };
}

async function lookupBarcodeAndOpen(rawBarcode, options = {}) {
  const parsed = parseBarcodeForProductLookup(rawBarcode);
  const displayBarcode = parsed.barcode || parsed.original_barcode || normalizeScannedText(rawBarcode);

  if (!displayBarcode) {
    updateScannerStatus('Enter or scan a barcode first.');
    return;
  }

  if (products.length === 0) {
    updateScannerStatus('No CSV products are loaded yet. Upload or load a CSV first.');
    return;
  }

  const product = findProductByBarcode(parsed);
  if (!product) {
    updateScannerStatus(`No product found for ${displayBarcode}.`);
    return;
  }

  els.barcodeLookup.value = displayBarcode;
  clearFiltersForBarcodeResult();
  navigateToProduct(product);
  updateScannerStatus(`Found ${product.name}.`);

  if (options.fromScanner) {
    await stopBarcodeScanner();
  }
}

function findProductByBarcode(parsedOrValue) {
  const aliases = new Set();
  if (typeof parsedOrValue === 'string') {
    addBarcodeAliasVariants(parsedOrValue, aliases);
  } else if (parsedOrValue && typeof parsedOrValue === 'object') {
    addBarcodeAliasVariants(parsedOrValue.original_barcode, aliases);
    addBarcodeAliasVariants(parsedOrValue.barcode, aliases);
    if (parsedOrValue.gs1_ai_01) addBarcodeAliasVariants(parsedOrValue.gs1_ai_01, aliases);
  }

  for (const alias of aliases) {
    const product = productBarcodeMap.get(alias.toLowerCase());
    if (product) return product;
  }
  return null;
}

function clearFiltersForBarcodeResult() {
  els.searchInput.value = '';
  els.categoryFilter.value = 'all';
  els.brandFilter.value = 'all';
  applyDefaultSort();
  render();
}

const SCANNER_FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'code_128',
  'code_39',
  'databar_expanded',
  'databar',
  'upc_a',
  'upc_e'
];

async function startBarcodeScanner() {
  if (scannerRunning) return;

  try {
    els.scannerReader.hidden = false;
    els.startScanner.disabled = true;
    els.stopScanner.disabled = false;
    updateScannerStatus('Starting camera scanner...');

    const Detector = await loadBarcodeDetector();
    const formats = await getSupportedBarcodeFormats(Detector);
    barcodeDetector = new Detector(formats.length ? { formats } : undefined);

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    scannerVideo = document.createElement('video');
    scannerVideo.className = 'scanner-video';
    scannerVideo.setAttribute('playsinline', '');
    scannerVideo.muted = true;
    scannerVideo.autoplay = true;
    scannerVideo.srcObject = scannerStream;
    els.scannerReader.replaceChildren(scannerVideo);

    await scannerVideo.play();
    scannerRunning = true;
    updateScannerStatus(`Scanning with BarcodeDetector (${formats.length ? formats.join(', ') : 'all supported formats'}). Point the camera at a barcode.`);
    scheduleBarcodeFrameScan();
  } catch (error) {
    await cleanupBarcodeScanner();
    updateScannerStatus(`Could not start scanner: ${error.message || error}`);
  }
}

async function loadBarcodeDetector() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not available in this browser.');
  }

  if ('BarcodeDetector' in window) {
    return window.BarcodeDetector;
  }

  const module = await import('https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js');
  if (module.prepareZXingModule && module.ZXING_WASM_VERSION) {
    module.prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => {
          if (path.endsWith('.wasm')) {
            return `https://fastly.jsdelivr.net/npm/zxing-wasm@${module.ZXING_WASM_VERSION}/dist/reader/${path}`;
          }
          return prefix + path;
        }
      }
    });
  }

  return module.BarcodeDetector;
}

async function getSupportedBarcodeFormats(Detector) {
  if (!Detector?.getSupportedFormats) return [...SCANNER_FORMATS];

  try {
    const supportedFormats = await Detector.getSupportedFormats();
    const supported = new Set(supportedFormats);
    return SCANNER_FORMATS.filter((format) => supported.has(format));
  } catch {
    return [...SCANNER_FORMATS];
  }
}

function scheduleBarcodeFrameScan() {
  if (!scannerRunning) return;
  scannerFrameRequest = window.requestAnimationFrame(scanBarcodeFrame);
}

async function scanBarcodeFrame() {
  if (!scannerRunning || !barcodeDetector || !scannerVideo) return;

  try {
    if (scannerVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const detectedCodes = await barcodeDetector.detect(scannerVideo);
      const firstCode = detectedCodes?.find((code) => code?.rawValue);
      if (firstCode) await handleScannerSuccess(firstCode.rawValue, firstCode.format);
    }
  } catch {
    // Ignore per-frame detection failures so the camera keeps scanning.
  } finally {
    scheduleBarcodeFrameScan();
  }
}

async function stopBarcodeScanner() {
  const wasRunning = scannerRunning || scannerStream || scannerVideo || scannerFrameRequest;
  await cleanupBarcodeScanner();
  if (wasRunning) updateScannerStatus('Scanner stopped.');
}

async function cleanupBarcodeScanner() {
  scannerRunning = false;

  if (scannerFrameRequest) {
    window.cancelAnimationFrame(scannerFrameRequest);
    scannerFrameRequest = 0;
  }

  if (scannerVideo) {
    scannerVideo.pause();
    scannerVideo.srcObject = null;
    scannerVideo.remove();
    scannerVideo = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }

  barcodeDetector = null;
  els.scannerReader.replaceChildren();
  els.scannerReader.hidden = true;
  els.startScanner.disabled = false;
  els.stopScanner.disabled = true;
}

async function handleScannerSuccess(decodedText, format = '') {
  const now = Date.now();
  const text = normalizeScannedText(decodedText);
  if (!text) return;

  if (text === lastScannerText && now - lastScannerAt < 2500) {
    return;
  }

  lastScannerText = text;
  lastScannerAt = now;
  const formatLabel = format ? ` ${format}` : '';
  updateScannerStatus(`Scanned${formatLabel} ${formatScannedTextForDisplay(text)}. Looking up product...`);
  await lookupBarcodeAndOpen(text, { fromScanner: true });
}

function updateScannerStatus(message) {
  els.scannerStatus.textContent = message;
}

function normalizeScannedText(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function stripScannerSymbologyIdentifier(value) {
  return normalizeScannedText(value).replace(/^\][A-Za-z0-9]{2}/, '');
}

function getCompactDigits(value) {
  return normalizeScannedText(value).replace(/\s/g, '');
}

function formatScannedTextForDisplay(value) {
  return normalizeScannedText(value).replace(/\x1D/g, '<GS>');
}

function isEan13(value) {
  return /^\d{13}$/.test(getCompactDigits(value));
}

function calculateEan13CheckDigit(first12Digits) {
  const digits = getCompactDigits(first12Digits);
  if (!/^\d{12}$/.test(digits)) return null;

  const sum = digits
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);

  return String((10 - (sum % 10)) % 10);
}

function isVariableWeightEan13(barcode) {
  const value = getCompactDigits(barcode);
  return isEan13(value) && value.startsWith('23');
}

function extractWeightKgFromEan13(barcode) {
  const value = getCompactDigits(barcode);
  if (!isVariableWeightEan13(value)) return null;
  const weightDigits = value.slice(7, 12);
  const weightKg = Number(weightDigits) / 1000;
  return Number.isFinite(weightKg) ? weightKg : null;
}

function normalizeVariableWeightEan13(barcode) {
  const value = getCompactDigits(barcode);
  if (!isVariableWeightEan13(value)) return value;

  const first12DigitsWithoutWeight = value.slice(0, 7) + '00000';
  const checkDigit = calculateEan13CheckDigit(first12DigitsWithoutWeight);
  return `${first12DigitsWithoutWeight}${checkDigit}`;
}

function extractWeightKgFromGs1_3103(weightDigits) {
  if (!/^\d{6}$/.test(String(weightDigits || ''))) return null;
  const weightKg = Number(weightDigits) / 1000;
  return Number.isFinite(weightKg) ? weightKg : null;
}

function parseBracketedGs1ApplicationIdentifiers(rawBarcode) {
  const text = stripScannerSymbologyIdentifier(rawBarcode);
  const gtinMatch = text.match(/\(01\)\s*(\d{14})/);
  if (!gtinMatch) return null;

  const weightMatch = text.match(/\(3103\)\s*(\d{6})/);
  return {
    gtin: gtinMatch[1],
    weight3103Digits: weightMatch ? weightMatch[1] : null
  };
}

function parseUnbracketedGs1ApplicationIdentifiers(rawBarcode) {
  const groupSeparator = '\x1D';
  const text = stripScannerSymbologyIdentifier(rawBarcode).replace(/[()\s]/g, '');

  if (/^\d{14}$/.test(text)) {
    return {
      gtin: text,
      weight3103Digits: null
    };
  }

  const values = {};
  let index = 0;

  while (index < text.length) {
    if (text[index] === groupSeparator) {
      index += 1;
      continue;
    }

    if (text.startsWith('01', index) && /^\d{14}/.test(text.slice(index + 2, index + 16))) {
      values['01'] = text.slice(index + 2, index + 16);
      index += 16;
      continue;
    }

    if (text.startsWith('3103', index) && /^\d{6}/.test(text.slice(index + 4, index + 10))) {
      values['3103'] = text.slice(index + 4, index + 10);
      index += 10;
      continue;
    }

    const fixedLengthAiDataLengths = {
      '00': 18,
      '02': 14,
      '11': 6,
      '13': 6,
      '15': 6,
      '17': 6
    };
    const ai2 = text.slice(index, index + 2);
    const fixedDataLength = fixedLengthAiDataLengths[ai2];

    if (fixedDataLength && /^\d+$/.test(text.slice(index + 2, index + 2 + fixedDataLength))) {
      values[ai2] = text.slice(index + 2, index + 2 + fixedDataLength);
      index += 2 + fixedDataLength;
      continue;
    }

    if (text.startsWith('10', index) || text.startsWith('21', index)) {
      const separatorIndex = text.indexOf(groupSeparator, index + 2);
      index = separatorIndex === -1 ? text.length : separatorIndex + 1;
      continue;
    }

    break;
  }

  if (!values['01']) return null;
  return {
    gtin: values['01'],
    weight3103Digits: values['3103'] || null
  };
}

function parseGs1ForProductLookup(rawBarcode) {
  const originalBarcode = normalizeScannedText(rawBarcode);
  const parsedGs1 = parseBracketedGs1ApplicationIdentifiers(originalBarcode) || parseUnbracketedGs1ApplicationIdentifiers(originalBarcode);

  if (!parsedGs1 || !/^\d{14}$/.test(parsedGs1.gtin)) {
    return null;
  }

  const weightKg = parsedGs1.weight3103Digits ? extractWeightKgFromGs1_3103(parsedGs1.weight3103Digits) : null;

  return {
    original_barcode: originalBarcode,
    barcode: parsedGs1.gtin,
    sold_by_weight: weightKg !== null,
    approximate_weight_kg: weightKg,
    barcode_type: weightKg !== null ? 'gs1_gtin_01_weight_3103' : 'gs1_gtin_01',
    gs1_ai_01: parsedGs1.gtin,
    gs1_ai_3103: parsedGs1.weight3103Digits
  };
}

function parseBarcodeForProductLookup(rawBarcode) {
  const originalBarcode = normalizeScannedText(rawBarcode);
  const compactBarcode = getCompactDigits(originalBarcode);
  const gs1Barcode = parseGs1ForProductLookup(originalBarcode);

  if (gs1Barcode) return gs1Barcode;

  if (isVariableWeightEan13(compactBarcode)) {
    const weightKg = extractWeightKgFromEan13(compactBarcode);
    const normalizedBarcode = normalizeVariableWeightEan13(compactBarcode);

    return {
      original_barcode: compactBarcode,
      barcode: normalizedBarcode,
      sold_by_weight: true,
      approximate_weight_kg: weightKg,
      barcode_type: 'ean13_variable_weight_23',
      gs1_ai_01: null,
      gs1_ai_3103: null
    };
  }

  return {
    original_barcode: compactBarcode,
    barcode: compactBarcode,
    sold_by_weight: false,
    approximate_weight_kg: null,
    barcode_type: isEan13(compactBarcode) ? 'ean13_normal' : 'manual_label',
    gs1_ai_01: null,
    gs1_ai_3103: null
  };
}

function clearFilters() {
  els.searchInput.value = '';
  els.categoryFilter.value = 'all';
  els.brandFilter.value = 'all';
  applyDefaultSort();
  render();
}

function applyDefaultSort() {
  const defaultSort = CONFIG.defaultSort || 'name-asc';
  const hasOption = [...els.sortSelect.options].some((option) => option.value === defaultSort);
  els.sortSelect.value = hasOption ? defaultSort : 'name-asc';
}

function hasValidPrice(product) {
  return Number.isFinite(product.price) && product.price > 0;
}

function formatPrice(value) {
  return priceFormatter.format(value);
}

function formatPriceLabel(value) {
  return Number.isFinite(value) && value > 0 ? formatPrice(value) : 'Price not set';
}

async function copyText(text, button, successLabel) {
  const originalText = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = successLabel;
  } catch {
    button.textContent = 'Copy failed';
  } finally {
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1300);
  }
}

function downloadCurrentCsv() {
  if (!currentRows.length) return;
  const csv = serializeCsv(currentHeaders, currentRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `products-updated-${date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function serializeCsv(headers, rows) {
  const cleanHeaders = normalizeHeaders(headers.length ? headers : collectHeaders(rows));
  const lines = [cleanHeaders.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(cleanHeaders.map((header) => csvEscape(getField(row, [header]))).join(','));
  });
  return `${lines.join('\r\n')}\r\n`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function showError(message) {
  products = [];
  productRouteMap = new Map();
  productBarcodeMap = new Map();
  resetSummary();
  buildFilterOptions();
  els.productGrid.replaceChildren();
  els.resultCount.textContent = 'Could not load products';
  els.emptyState.hidden = true;
  els.downloadCsv.disabled = true;
  const error = document.createElement('div');
  error.className = 'error-box';
  error.textContent = message;
  els.productGrid.append(error);
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function slugify(value) {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `product-${Math.random().toString(36).slice(2, 8)}`;
}
