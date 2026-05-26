const DEFAULT_CONFIG = {
  storeName: 'Store Product Display',
  dataSource: '/api/products',
  priceUpdateSource: '/api/update-price',
  dataFormat: 'auto',
  loadOnStart: false,
  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  sourceCodeField: 'source_code',
  defaultSort: 'source-code-asc'
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.STORE_DISPLAY_CONFIG || {})
};

const els = {
  storeName: document.querySelector('#store-name'),
  totalProducts: document.querySelector('#total-products'),
  totalCategories: document.querySelector('#total-categories'),
  averagePrice: document.querySelector('#average-price'),
  searchInput: document.querySelector('#search-input'),
  loadProducts: document.querySelector('#load-products'),
  loadStatus: document.querySelector('#load-status'),
  refreshData: document.querySelector('#refresh-data'),
  categoryFilter: document.querySelector('#category-filter'),
  brandFilter: document.querySelector('#brand-filter'),
  sortSelect: document.querySelector('#sort-select'),
  clearFilters: document.querySelector('#clear-filters'),
  resultCount: document.querySelector('#result-count'),
  dataSourceLabel: document.querySelector('#data-source-label'),
  categoryChips: document.querySelector('#category-chips'),
  productGrid: document.querySelector('#product-grid'),
  emptyState: document.querySelector('#empty-state'),
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
let productRouteMap = new Map();
let productBarcodeMap = new Map();
let activeSourceName = CONFIG.dataSource || 'not configured';
let hasLoadedOnce = false;
let html5QrcodeScanner = null;
let scannerRunning = false;
let lastScannerText = '';
let lastScannerAt = 0;

init();

async function init() {
  els.storeName.textContent = CONFIG.storeName;
  applyDefaultSort();
  bindEvents();
  resetSummary();
  buildFilterOptions();
  updateScannerStatus('Load products, then scan or enter a barcode.');

  if (CONFIG.loadOnStart) {
    await loadProductsFromN8n();
  }
}

function bindEvents() {
  els.searchInput.addEventListener('input', render);
  els.categoryFilter.addEventListener('change', render);
  els.brandFilter.addEventListener('change', render);
  els.sortSelect.addEventListener('change', render);
  els.clearFilters.addEventListener('click', clearFilters);
  els.loadProducts.addEventListener('click', loadProductsFromN8n);
  els.refreshData.addEventListener('click', loadProductsFromN8n);
  els.lookupBarcode.addEventListener('click', () => lookupBarcodeAndOpen(els.barcodeLookup.value, { fromScanner: false }));
  els.barcodeLookup.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      lookupBarcodeAndOpen(els.barcodeLookup.value, { fromScanner: false });
    }
  });
  els.startScanner.addEventListener('click', startBarcodeScanner);
  els.stopScanner.addEventListener('click', stopBarcodeScanner);

  els.dialogClose.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (event) => {
    if (event.target === els.dialog) {
      els.dialog.close();
    }
  });
  els.dialog.addEventListener('close', () => {
    if (location.hash.startsWith('#/product/')) {
      history.pushState('', document.title, `${location.pathname}${location.search}`);
    }
  });

  window.addEventListener('hashchange', openProductFromHash);
}

async function loadProductsFromN8n() {
  if (!CONFIG.dataSource) {
    showError('No data source is configured. Add your n8n webhook URL to config.js, or set dataSource to /api/products and set N8N_PRODUCTS_WEBHOOK_URL in Netlify.');
    return;
  }

  setLoadingState(true, 'Loading products from n8n...');

  try {
    const rows = await loadProductsFromSource(CONFIG.dataSource);
    setProducts(rows, CONFIG.dataSource);
    const count = products.length;
    hasLoadedOnce = true;
    setLoadingState(false, `Loaded ${count} product${count === 1 ? '' : 's'}.`);
    updateScannerStatus(`Loaded ${count} product${count === 1 ? '' : 's'}. Scan or enter a barcode.`);
  } catch (error) {
    setLoadingState(false, 'Load failed.');
    updateScannerStatus('Could not load products.');
    showError(buildFriendlyError(error));
  }
}

async function loadProductsFromSource(source) {
  const response = await fetch(source, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json, text/csv, text/plain;q=0.9, */*;q=0.8'
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const detail = errorText ? `: ${errorText.slice(0, 220)}` : '';
    throw new Error(`HTTP ${response.status}${detail}`);
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const format = detectDataFormat(source, contentType, text);

  if (format === 'json') {
    return normalizeJsonPayload(JSON.parse(text));
  }

  return parseCsv(text);
}

function detectDataFormat(source, contentType, text) {
  if (CONFIG.dataFormat && CONFIG.dataFormat !== 'auto') {
    return CONFIG.dataFormat.toLowerCase();
  }

  const lowerSource = String(source || '').toLowerCase();
  const lowerContentType = contentType.toLowerCase();

  if (lowerContentType.includes('json') || lowerSource.includes('.json')) return 'json';
  if (lowerContentType.includes('csv') || lowerSource.includes('.csv')) return 'csv';

  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'csv';
}

function normalizeJsonPayload(payload) {
  const rows = extractRows(payload);
  return rows.map((row) => {
    if (row && typeof row === 'object' && row.json && typeof row.json === 'object') {
      return row.json;
    }
    return row;
  });
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.items)) return payload.items;

    if (typeof payload.csv === 'string') return parseCsv(payload.csv);
    if (typeof payload.body === 'string') {
      const body = payload.body.trim();
      if (body.startsWith('{') || body.startsWith('[')) return normalizeJsonPayload(JSON.parse(body));
      return parseCsv(body);
    }
  }

  throw new Error('JSON must be an array, an n8n item array, or an object with products/data/rows/items.');
}

function setProducts(rows, sourceName) {
  activeSourceName = sourceName;
  products = rows
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

  buildFilterOptions();
  renderSummary();
  render();
  openProductFromHash();
}

function parseCsv(text) {
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

  if (table.length < 2) return [];

  const headers = table[0].map((header) => cleanHeader(header));
  return table.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? '';
    });
    return item;
  });
}

function cleanHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

function normalizeProduct(row, index) {
  const sourceRow = row && typeof row === 'object' ? row : { value: row };
  const name = getField(sourceRow, ['name', 'product_name', 'title']);
  const brand = getField(sourceRow, ['brand', 'manufacturer']) || 'No brand';
  const barcodeValues = collectBarcodeValues(sourceRow);
  const barcode = barcodeValues[0] || '';
  const barcodeAliases = buildBarcodeAliases(barcodeValues);
  const sourceCode = getSourceCode(sourceRow);
  const costRaw = getField(sourceRow, [CONFIG.priceField, 'price', 'regular_price']);
  const price = parsePrice(costRaw);
  const category = getField(sourceRow, ['store_categories', 'store_category', 'category']) || 'Uncategorized';
  const categories = getField(sourceRow, ['categories', 'category_path']);
  const ingredients = getField(sourceRow, ['ingredients', 'description']);
  const weight = getField(sourceRow, ['weight', 'package_weight', 'size']);
  const status = getField(sourceRow, ['status']);
  const imageUrl = normalizeImageUrl(getField(sourceRow, [CONFIG.imageField, 'image', 'image_url', 'img_url']));
  const idBase = barcode || sourceCode || `${name}-${index + 1}`;
  const routeKey = slugify(idBase || `product-${index + 1}`);

  return {
    id: `${routeKey}-${index + 1}`,
    routeKey,
    rowNumber: index + 1,
    sourceRow,
    name: name.trim(),
    brand: brand.trim(),
    barcode: barcode.trim(),
    barcodeAliases,
    sourceCode: sourceCode.trim(),
    price,
    priceRaw: costRaw.trim(),
    category: category.trim(),
    categories: categories.trim(),
    ingredients: ingredients.trim(),
    weight: weight.trim(),
    status: status.trim(),
    imageUrl,
    searchText: [name, brand, barcode, barcodeAliases.join(' '), sourceCode, category, categories, ingredients, weight]
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

function getSourceCode(row) {
  const direct = getField(row, [
    CONFIG.sourceCodeField,
    'source_code',
    'source code',
    'sourceCode',
    'source',
    'store_source_code',
    'inventory_source_code'
  ]);
  if (direct) return direct;

  const sourceLikeKey = Object.keys(row).find((key) => normalizeKey(key).includes('sourcecode'));
  return sourceLikeKey ? String(row[sourceLikeKey] || '') : '';
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

function parsePrice(value) {
  const cleaned = String(value || '')
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceForData(value) {
  if (!Number.isFinite(value)) return '';
  return CONFIG.currency === 'ISK' ? String(Math.round(value)) : value.toFixed(2);
}

function normalizeImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return 'assets/placeholder.svg';
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
  els.dataSourceLabel.textContent = `Source: ${activeSourceName}`;
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
  els.dataSourceLabel.textContent = `Source: ${activeSourceName}`;
}

function render() {
  const filtered = getFilteredProducts();
  els.productGrid.replaceChildren();

  const fragment = document.createDocumentFragment();
  filtered.forEach((product) => fragment.append(renderProductCard(product)));
  els.productGrid.append(fragment);

  els.resultCount.textContent = `${filtered.length} of ${products.length} products shown`;
  els.emptyState.hidden = hasLoadedOnce && filtered.length > 0;
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
    case 'source-code-asc':
      return compareTextWithMissingLast(a.sourceCode, b.sourceCode, 'asc') || collator.compare(a.name, b.name);
    case 'source-code-desc':
      return compareTextWithMissingLast(a.sourceCode, b.sourceCode, 'desc') || collator.compare(a.name, b.name);
    case 'price-asc':
      return comparePrices(a, b, 'asc') || collator.compare(a.name, b.name);
    case 'price-desc':
      return comparePrices(a, b, 'desc') || collator.compare(a.name, b.name);
    case 'brand-asc':
      return collator.compare(a.brand, b.brand) || collator.compare(a.name, b.name);
    case 'category-asc':
      return collator.compare(a.category, b.category) || collator.compare(a.name, b.name);
    case 'name-asc':
      return collator.compare(a.name, b.name);
    default:
      return compareTextWithMissingLast(a.sourceCode, b.sourceCode, 'asc') || collator.compare(a.name, b.name);
  }
}

function compareTextWithMissingLast(aValue, bValue, direction = 'asc') {
  const aText = String(aValue || '').trim();
  const bText = String(bValue || '').trim();
  const aMissing = aText === '';
  const bMissing = bText === '';

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const result = collator.compare(aText, bText);
  return direction === 'desc' ? -result : result;
}

function comparePrices(a, b, direction) {
  const aPrice = Number.isFinite(a.price) && a.price > 0 ? a.price : Number.POSITIVE_INFINITY;
  const bPrice = Number.isFinite(b.price) && b.price > 0 ? b.price : Number.POSITIVE_INFINITY;
  return direction === 'asc' ? aPrice - bPrice : bPrice - aPrice;
}

function renderProductCard(product) {
  const fragment = els.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.product-card');
  const link = fragment.querySelector('.product-card__image-link');
  const image = fragment.querySelector('.product-card__image');
  const category = fragment.querySelector('.product-card__category');
  const barcode = fragment.querySelector('.product-card__barcode');
  const name = fragment.querySelector('.product-card__name');
  const brand = fragment.querySelector('.product-card__brand');
  const sourceCode = fragment.querySelector('.product-card__source-code');
  const price = fragment.querySelector('.product-card__price');
  const weight = fragment.querySelector('.product-card__weight');
  const button = fragment.querySelector('.product-card__button');

  const productUrl = `#/product/${encodeURIComponent(product.routeKey)}`;
  link.href = productUrl;
  image.src = product.imageUrl;
  image.alt = `${product.name} product image`;
  image.onerror = () => {
    image.onerror = null;
    image.src = 'assets/placeholder.svg';
  };
  category.textContent = product.category || 'Uncategorized';
  barcode.textContent = product.barcode ? `#${product.barcode}` : `Row ${product.rowNumber}`;
  name.textContent = product.name;
  brand.textContent = product.brand;
  sourceCode.textContent = product.sourceCode ? `Source code: ${product.sourceCode}` : 'No source code';
  price.textContent = formatPriceLabel(product.price);
  price.classList.toggle('is-missing', !hasValidPrice(product));
  weight.textContent = product.weight || 'No weight';

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
  if (!location.hash.startsWith('#/product/')) return;
  const rawKey = location.hash.replace('#/product/', '');
  const key = decodeURIComponent(rawKey).toLowerCase();
  const product = productRouteMap.get(key) || productBarcodeMap.get(key);

  if (product) {
    openProduct(product);
  }
}

function openProduct(product) {
  els.productDetails.innerHTML = renderProductDetails(product);

  const detailImage = els.productDetails.querySelector('.product-details__image');
  detailImage.onerror = () => {
    detailImage.onerror = null;
    detailImage.src = 'assets/placeholder.svg';
  };

  const copyBarcodeButton = els.productDetails.querySelector('[data-action="copy-barcode"]');
  const copyLinkButton = els.productDetails.querySelector('[data-action="copy-link"]');
  const priceForm = els.productDetails.querySelector('[data-action="price-form"]');

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

  if (!els.dialog.open) {
    els.dialog.showModal();
  }
}

function renderProductDetails(product) {
  const productLink = `#/product/${encodeURIComponent(product.routeKey)}`;
  const ingredients = product.ingredients || 'No ingredients text in the data yet.';
  const fullCategory = product.categories || product.category || 'No category path';
  const priceInputValue = Number.isFinite(product.price) && product.price > 0 ? String(product.price) : '';

  return `
    <div>
      <img class="product-details__image" src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.name)} product image" />
    </div>
    <div class="product-details__content">
      <span class="badge">${escapeHtml(product.category || 'Uncategorized')}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p class="product-card__brand">${escapeHtml(product.brand)}</p>
      <div class="detail-price ${hasValidPrice(product) ? '' : 'product-card__price is-missing'}" data-price-display>${escapeHtml(formatPriceLabel(product.price))}</div>

      <form class="price-edit-form" data-action="price-form">
        <label>
          <span>New price (${escapeHtml(CONFIG.currency || 'ISK')})</span>
          <input data-price-input type="number" min="0" step="${CONFIG.currency === 'ISK' ? '1' : '0.01'}" inputmode="decimal" value="${escapeAttribute(priceInputValue)}" placeholder="Enter new price" />
        </label>
        <button class="button" type="submit">Save price</button>
        <small data-price-status class="price-edit-status">Price update will be sent to n8n.</small>
      </form>

      <div class="detail-grid">
        ${detailItem('Weight', product.weight || 'No weight')}
        ${detailItem('Barcode / GTIN', product.barcode || 'No barcode')}
        ${detailItem('Source code', product.sourceCode || 'No source code')}
        ${detailItem('Store category', product.category || 'Uncategorized')}
        ${detailItem('Status', product.status || 'No status')}
        ${detailItem('Source row', String(product.rowNumber))}
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
    </div>
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

async function saveProductPrice(product, form) {
  const input = form.querySelector('[data-price-input]');
  const status = form.querySelector('[data-price-status]');
  const button = form.querySelector('button[type="submit"]');
  const newPrice = parsePrice(input.value);

  if (!Number.isFinite(newPrice) || newPrice < 0) {
    status.textContent = 'Enter a valid price.';
    status.className = 'price-edit-status price-edit-status--error';
    return;
  }

  if (!CONFIG.priceUpdateSource) {
    status.textContent = 'No price update endpoint is configured.';
    status.className = 'price-edit-status price-edit-status--error';
    return;
  }

  const oldPrice = product.price;
  const payload = buildPriceUpdatePayload(product, newPrice, oldPrice);

  button.disabled = true;
  status.textContent = 'Saving price to n8n...';
  status.className = 'price-edit-status';

  try {
    const response = await fetch(CONFIG.priceUpdateSource, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || `HTTP ${response.status}`);
    }

    updateProductPriceInMemory(product, newPrice);
    status.textContent = 'Price saved.';
    status.className = 'price-edit-status price-edit-status--success';
    updateOpenPriceDisplay(product);
    renderSummary();
    render();
  } catch (error) {
    status.textContent = `Price save failed: ${(error?.message || String(error)).slice(0, 180)}`;
    status.className = 'price-edit-status price-edit-status--error';
  } finally {
    button.disabled = false;
  }
}

function buildPriceUpdatePayload(product, newPrice, oldPrice) {
  return {
    action: 'update_price',
    barcode: product.barcode,
    barcode_aliases: product.barcodeAliases,
    source_code: product.sourceCode,
    row_number: product.rowNumber,
    name: product.name,
    brand: product.brand,
    old_price: Number.isFinite(oldPrice) ? oldPrice : null,
    new_price: newPrice,
    formatted_new_price: formatPriceForData(newPrice),
    currency: CONFIG.currency,
    price_field: CONFIG.priceField,
    source_row: product.sourceRow,
    updated_at: new Date().toISOString()
  };
}

function updateProductPriceInMemory(product, newPrice) {
  const formatted = formatPriceForData(newPrice);
  product.price = newPrice;
  product.priceRaw = formatted;

  const sourceRow = product.sourceRow || {};
  const keys = [CONFIG.priceField, 'cost', 'price', 'regular_price'];
  const existingKey = keys.find((key) => key && Object.prototype.hasOwnProperty.call(sourceRow, key));
  sourceRow[existingKey || CONFIG.priceField || 'price'] = formatted;
}

function updateOpenPriceDisplay(product) {
  const display = els.productDetails.querySelector('[data-price-display]');
  const input = els.productDetails.querySelector('[data-price-input]');
  if (display) {
    display.textContent = formatPriceLabel(product.price);
    display.classList.toggle('is-missing', !hasValidPrice(product));
  }
  if (input) input.value = Number.isFinite(product.price) ? String(product.price) : '';
}

async function lookupBarcodeAndOpen(rawBarcode, options = {}) {
  const parsed = parseBarcodeForProductLookup(rawBarcode);
  const lookupValue = parsed.barcode || parsed.original_barcode || rawBarcode;

  if (!lookupValue) {
    updateScannerStatus('Enter or scan a barcode first.');
    return null;
  }

  els.barcodeLookup.value = lookupValue;

  if (!hasLoadedOnce || products.length === 0) {
    updateScannerStatus('Loading products before barcode lookup...');
    await loadProductsFromN8n();
  }

  const product = findProductByBarcode(parsed);
  if (!product) {
    updateScannerStatus(`No product found for barcode ${lookupValue}.`);
    els.searchInput.value = lookupValue;
    render();
    return null;
  }

  clearFiltersForBarcodeResult();
  els.searchInput.value = product.barcode || lookupValue;
  updateScannerStatus(`Found ${product.name}.`);
  navigateToProduct(product);

  if (options.fromScanner) {
    await stopBarcodeScanner();
  }

  return product;
}

function findProductByBarcode(parsedOrValue) {
  const aliases = parsedOrValue && typeof parsedOrValue === 'object'
    ? buildBarcodeAliases([parsedOrValue.barcode, parsedOrValue.original_barcode, parsedOrValue.gs1_ai_01])
    : buildBarcodeAliases(parsedOrValue);

  for (const alias of aliases) {
    const product = productBarcodeMap.get(alias.toLowerCase());
    if (product) return product;
  }

  return null;
}

function clearFiltersForBarcodeResult() {
  els.categoryFilter.value = 'all';
  els.brandFilter.value = 'all';
  applyDefaultSort();
}

async function startBarcodeScanner() {
  if (scannerRunning) return;

  if (!window.Html5Qrcode) {
    updateScannerStatus('Camera scanner library did not load. Use manual barcode entry.');
    return;
  }

  els.scannerReader.hidden = false;
  updateScannerStatus('Starting camera scanner...');

  try {
    html5QrcodeScanner = new window.Html5Qrcode('scanner-reader');
    const config = buildScannerConfig();

    try {
      await html5QrcodeScanner.start(
        { facingMode: { exact: 'environment' } },
        config,
        handleScannerSuccess,
        () => {}
      );
    } catch {
      await html5QrcodeScanner.start(
        { facingMode: 'environment' },
        config,
        handleScannerSuccess,
        () => {}
      );
    }

    scannerRunning = true;
    els.startScanner.disabled = true;
    els.stopScanner.disabled = false;
    updateScannerStatus('Scanning for EAN, UPC, GS1 DataMatrix, or GS1-128 barcode...');
  } catch (error) {
    scannerRunning = false;
    els.scannerReader.hidden = true;
    els.startScanner.disabled = false;
    els.stopScanner.disabled = true;
    updateScannerStatus(`Could not start scanner: ${error?.message || error}`);
  }
}

async function stopBarcodeScanner() {
  if (!html5QrcodeScanner || !scannerRunning) {
    els.scannerReader.hidden = true;
    els.startScanner.disabled = false;
    els.stopScanner.disabled = true;
    return;
  }

  try {
    await html5QrcodeScanner.stop();
    await html5QrcodeScanner.clear();
  } catch {
    // Ignore cleanup failures from browsers that already stopped the stream.
  }

  scannerRunning = false;
  html5QrcodeScanner = null;
  els.scannerReader.hidden = true;
  els.startScanner.disabled = false;
  els.stopScanner.disabled = true;
  updateScannerStatus('Scanner stopped.');
}

function buildScannerConfig() {
  const config = {
    fps: 10,
    qrbox: { width: 280, height: 180 },
    aspectRatio: 1.6
  };

  const formatsToSupport = getHtml5QrcodeSupportedFormats();
  if (formatsToSupport.length) {
    config.formatsToSupport = formatsToSupport;
  }

  return config;
}

function getHtml5QrcodeSupportedFormats() {
  const supportedFormats = window.Html5QrcodeSupportedFormats;
  if (!supportedFormats) return [];

  const scannerFormatNames = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'DATA_MATRIX', 'CODE_128', 'RSS_14', 'RSS_EXPANDED'];

  return scannerFormatNames
    .map((formatName) => supportedFormats[formatName])
    .filter((format) => format !== undefined && format !== null);
}

async function handleScannerSuccess(decodedText) {
  const now = Date.now();
  const text = normalizeScannedText(decodedText);
  if (!text) return;

  if (text === lastScannerText && now - lastScannerAt < 2500) {
    return;
  }

  lastScannerText = text;
  lastScannerAt = now;
  updateScannerStatus(`Scanned ${formatScannedTextForDisplay(text)}. Looking up product...`);
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
  const defaultSort = CONFIG.defaultSort || 'source-code-asc';
  const hasOption = [...els.sortSelect.options].some((option) => option.value === defaultSort);
  els.sortSelect.value = hasOption ? defaultSort : 'source-code-asc';
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

function setLoadingState(isLoading, message) {
  els.loadProducts.disabled = isLoading;
  els.refreshData.disabled = isLoading;
  els.loadStatus.textContent = message;
}

function buildFriendlyError(error) {
  const message = error?.message || String(error);
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'Could not fetch the n8n webhook. If config.js points directly to n8n, add CORS headers in the n8n Respond to Webhook node. Or keep dataSource as /api/products and set N8N_PRODUCTS_WEBHOOK_URL in Netlify.';
  }
  return `Could not load product data: ${message}`;
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
