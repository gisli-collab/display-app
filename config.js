window.STORE_DISPLAY_CONFIG = {
  storeName: 'Store Product Display',

  // Product list:
  // Keep this as /api/products and set N8N_PRODUCTS_WEBHOOK_URL in Netlify.
  // The included Netlify Function only forwards the request to n8n;
  // it does not store product data.
  dataSource: '/api/products',

  // Price updates:
  // Keep this as /api/update-price and set N8N_PRICE_UPDATE_WEBHOOK_URL in Netlify.
  // The included Netlify Function forwards the changed price to n8n.
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
