const DEFAULT_CONFIG = {
  storeName: 'Store Product Display',
  dataSource: './data/products.csv',
  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  defaultSort: 'name-asc'
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
let activeSourceName = CONFIG.dataSource;
let csvDirty = false;
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

async function loadInitialData() {
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
    updateScannerStatus('Could not load the default CSV. Upload a CSV file, then scan or enter a barcode.');
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
  const required = [CONFIG.priceField, CONFIG.barcodeField, CONFIG.imageField, 'name', 'weight', 'brand'];
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
  const status = getField(sourceRow, ['status']);
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
    imageUrl,
    searchText: [name, brand, barcode, barcodeAliases.join(' '), category, categories, ingredients, weight]
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
  els.dataSourceLabel.textContent = 'Source: CSV';
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

function renderProductCard(product) {
  const fragment = els.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.product-card');
  const link = fragment.querySelector('.product-card__image-link');
  const image = fragment.querySelector('.product-card__image');
  const category = fragment.querySelector('.product-card__category');
  const barcode = fragment.querySelector('.product-card__barcode');
  const name = fragment.querySelector('.product-card__name');
  const brand = fragment.querySelector('.product-card__brand');
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
  const product = productRouteMap.get(key);

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
  const priceForm = els.productDetails.querySelector('[data-price-form]');

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
  const priceValue = Number.isFinite(product.price) && product.price > 0 ? product.price : '';

  return `
    <div>
      <img class="product-details__image" src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.name)} product image" />
    </div>
    <div class="product-details__content">
      <span class="badge">${escapeHtml(product.category || 'Uncategorized')}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p class="product-card__brand">${escapeHtml(product.brand)}</p>
      <div class="detail-price ${hasValidPrice(product) ? '' : 'product-card__price is-missing'}" data-current-price>
        ${escapeHtml(formatPriceLabel(product.price))}
      </div>

      <form class="price-edit" data-price-form>
        <label>
          <span>New price</span>
          <input name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeAttribute(priceValue)}" placeholder="Enter new price" />
        </label>
        <button class="button" type="submit">Update price locally</button>
        <small data-price-status>Download the updated CSV to make the change permanent.</small>
      </form>

      <div class="detail-grid">
        ${detailItem('Weight', product.weight || 'No weight')}
        ${detailItem('Barcode / GTIN', product.barcode || 'No barcode')}
        ${detailItem('Store category', product.category || 'Uncategorized')}
        ${detailItem('Status', product.status || 'No status')}
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
  product.searchText = [product.name, product.brand, product.barcode, product.barcodeAliases.join(' '), product.category, product.categories, product.ingredients, product.weight]
    .join(' ')
    .toLocaleLowerCase(CONFIG.locale || undefined);

  csvDirty = true;
  els.downloadCsv.disabled = false;
  status.textContent = `Price updated locally to ${formatPriceLabel(product.price)}. Download the CSV and replace data/products.csv in GitHub to publish it.`;
  status.className = 'price-status price-status--success';

  const currentPrice = form.closest('.product-details__content')?.querySelector('[data-current-price]');
  if (currentPrice) {
    currentPrice.textContent = formatPriceLabel(product.price);
    currentPrice.classList.toggle('is-missing', !hasValidPrice(product));
  }

  renderSummary();
  render();
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

async function startBarcodeScanner() {
  if (!window.Html5Qrcode) {
    updateScannerStatus('Camera scanner library did not load. Type the barcode manually instead.');
    return;
  }

  if (scannerRunning) return;

  try {
    els.scannerReader.hidden = false;
    els.startScanner.disabled = true;
    els.stopScanner.disabled = false;
    updateScannerStatus('Starting camera...');

    html5QrcodeScanner = new window.Html5Qrcode('scanner-reader', false);
    const cameras = await window.Html5Qrcode.getCameras();
    if (!cameras.length) {
      throw new Error('No camera found.');
    }

    const backCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label));
    const cameraId = backCamera?.id || cameras[0].id;

    await html5QrcodeScanner.start(
      cameraId,
      buildScannerConfig(),
      handleScannerSuccess,
      () => {}
    );

    scannerRunning = true;
    updateScannerStatus('Scanning... point the camera at a barcode.');
  } catch (error) {
    scannerRunning = false;
    els.scannerReader.hidden = true;
    els.startScanner.disabled = false;
    els.stopScanner.disabled = true;
    updateScannerStatus(`Could not start scanner: ${error.message || error}`);

    try {
      if (html5QrcodeScanner) await html5QrcodeScanner.clear();
    } catch {
      // Ignore scanner cleanup failures.
    }
    html5QrcodeScanner = null;
  }
}

async function stopBarcodeScanner() {
  if (!html5QrcodeScanner) {
    scannerRunning = false;
    els.scannerReader.hidden = true;
    els.startScanner.disabled = false;
    els.stopScanner.disabled = true;
    return;
  }

  try {
    if (scannerRunning) await html5QrcodeScanner.stop();
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
