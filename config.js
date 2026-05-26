// Store Display App configuration
// The app first checks the Netlify API endpoint that n8n can update.
// If that endpoint has no uploaded data yet, it falls back to the included CSV file.
// The app can read either CSV or JSON arrays with similar product fields.
window.STORE_DISPLAY_CONFIG = {
  storeName: 'Test Store Icelandic',
  dataSource: './api/products',
  fallbackDataSource: './data/products.csv',
  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  sourceCodeField: 'source_code',
  defaultSort: 'source-code-asc'
};
