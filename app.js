const DEFAULT_CONFIG = {
  storeName: 'Store Product Display',
  dataSource: './api/products',
  fallbackDataSource: './data/products.csv',
  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  sourceCodeField: 'source_code',
  defaultSort: 'source-row-asc'
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
  fileInput: document.querySelector('#csv-file-input'),
  dialog: document.querySelector('#product-dialog'),
  dialogClose: document.querySelector('#dialog-close'),
  productDetails: document.querySelector('#product-details'),
  cardTemplate: document.querySelector('#product-card-template')
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
let activeSourceName = CONFIG.dataSource;

init();

async function init() {
  els.storeName.textContent = CONFIG.storeName;
  applyDefaultSort();
  bindEvents();
  await loadInitialData();
}

function bindEvents() {
  els.searchInput.addEventListener('input', render);
  els.categoryFilter.addEventListener('change', render);
  els.brandFilter.addEventListener('change', render);
  els.sortSelect.addEventListener('change', render);
  els.clearFilters.addEventListener('click', clearFilters);
  els.refreshData?.addEventListener('click', loadInitialData);

  els.fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setProducts(parseCsv(text), file.name);
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
  const sources = [CONFIG.dataSource, CONFIG.fallbackDataSource].filter(Boolean);
  const errors = [];

  for (const source of sources) {
    try {
      const rows = await loadProductsFromSource(source);
      setProducts(rows, source);
      return;
    } catch (error) {
      errors.push(`${source}: ${error.message}`);
    }
  }

  showError(`Could not load product data. ${errors.join(' | ')}`);
}

async function loadProductsFromSource(source) {
  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('json') || source.toLowerCase().includes('.json');
  return isJson ? normalizeJsonPayload(JSON.parse(text)) : parseCsv(text);
}

function normalizeJsonPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  throw new Error('JSON must be an array, or an object with a products/data/rows/items array.');
}

function setProducts(rows, sourceName) {
  activeSourceName = sourceName;
  products = rows
    .map((row, index) => normalizeProduct(row, index))
    .filter((product) => product.name);

  productRouteMap = new Map();
  products.forEach((product) => {
    if (!productRouteMap.has(product.routeKey)) {
      productRouteMap.set(product.routeKey, product);
    }
    if (product.barcode && !productRouteMap.has(product.barcode.toLowerCase())) {
      productRouteMap.set(product.barcode.toLowerCase(), product);
    }
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
  const name = getField(row, ['name', 'product_name', 'title']);
  const brand = getField(row, ['brand', 'manufacturer']) || 'No brand';
  const barcode = getField(row, [CONFIG.barcodeField, 'barcode', 'gtin', 'ean', 'sku']);
  const sourceCode = getSourceCode(row);
  const costRaw = getField(row, [CONFIG.priceField, 'price', 'regular_price']);
  const price = parsePrice(costRaw);
  const category = getField(row, ['store_categories', 'store_category', 'category']) || 'Uncategorized';
  const categories = getField(row, ['categories', 'category_path']);
  const ingredients = getField(row, ['ingredients', 'description']);
  const weight = getField(row, ['weight', 'package_weight', 'size']);
  const status = getField(row, ['status']);
  const imageUrl = normalizeImageUrl(getField(row, [CONFIG.imageField, 'image', 'image_url', 'img_url']));
  const idBase = barcode || `${name}-${index + 1}`;
  const routeKey = slugify(idBase || `product-${index + 1}`);

  return {
    id: `${routeKey}-${index + 1}`,
    routeKey,
    rowNumber: index + 2,
    sourceRow: row,
    name: name.trim(),
    brand: brand.trim(),
    barcode: barcode.trim(),
    sourceCode: sourceCode.trim(),
    price,
    priceRaw: costRaw.trim(),
    category: category.trim(),
    categories: categories.trim(),
    ingredients: ingredients.trim(),
    weight: weight.trim(),
    status: status.trim(),
    imageUrl,
    searchText: [name, brand, barcode, sourceCode, category, categories, ingredients, weight]
      .join(' ')
      .toLocaleLowerCase(CONFIG.locale || undefined)
  };
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

function renderSummary() {
  const categories = new Set(products.map((product) => product.category).filter(Boolean));
  const validPrices = products.map((product) => product.price).filter((price) => Number.isFinite(price) && price > 0);
  const average = validPrices.length
    ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
    : null;

  els.totalProducts.textContent = String(products.length);
  els.totalCategories.textContent = String(categories.size);
  els.averagePrice.textContent = average === null ? '—' : formatPrice(average);
  els.dataSourceLabel.textContent = `Source: ${activeSourceName}`;
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
    case 'source-row-asc':
    case 'source-code-asc':
      return compareRows(a, b, 'asc') || collator.compare(a.name, b.name);
    case 'source-row-desc':
    case 'source-code-desc':
      return compareRows(a, b, 'desc') || collator.compare(a.name, b.name);
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
      return compareRows(a, b, 'asc') || collator.compare(a.name, b.name);
  }
}

function compareRows(a, b, direction = 'asc') {
  const aRow = Number.isFinite(a.rowNumber) ? a.rowNumber : Number.POSITIVE_INFINITY;
  const bRow = Number.isFinite(b.rowNumber) ? b.rowNumber : Number.POSITIVE_INFINITY;
  return direction === 'desc' ? bRow - aRow : aRow - bRow;
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

  copyBarcodeButton?.addEventListener('click', async () => {
    await copyText(product.barcode || product.name, copyBarcodeButton, 'Copied barcode');
  });

  copyLinkButton?.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}${location.search}#/product/${encodeURIComponent(product.routeKey)}`;
    await copyText(url, copyLinkButton, 'Copied link');
  });

  if (!els.dialog.open) {
    els.dialog.showModal();
  }
}

function renderProductDetails(product) {
  const productLink = `#/product/${encodeURIComponent(product.routeKey)}`;
  const ingredients = product.ingredients || 'No ingredients text in the data yet.';
  const fullCategory = product.categories || product.category || 'No category path';

  return `
    <div>
      <img class="product-details__image" src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.name)} product image" />
    </div>
    <div class="product-details__content">
      <span class="badge">${escapeHtml(product.category || 'Uncategorized')}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p class="product-card__brand">${escapeHtml(product.brand)}</p>
      <div class="detail-price ${hasValidPrice(product) ? '' : 'product-card__price is-missing'}">${escapeHtml(formatPriceLabel(product.price))}</div>

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

function clearFilters() {
  els.searchInput.value = '';
  els.categoryFilter.value = 'all';
  els.brandFilter.value = 'all';
  applyDefaultSort();
  render();
}

function applyDefaultSort() {
  const defaultSort = CONFIG.defaultSort || 'source-row-asc';
  const fallbackSort = [...els.sortSelect.options].some((option) => option.value === 'source-row-asc')
    ? 'source-row-asc'
    : 'source-code-asc';
  const hasOption = [...els.sortSelect.options].some((option) => option.value === defaultSort);
  els.sortSelect.value = hasOption ? defaultSort : fallbackSort;
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

function showError(message) {
  els.productGrid.replaceChildren();
  els.resultCount.textContent = 'Could not load products';
  els.emptyState.hidden = true;
  const error = document.createElement('div');
  error.className = 'error-box';
  error.textContent = message;
  els.productGrid.append(error);
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
