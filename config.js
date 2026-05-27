window.STORE_DISPLAY_CONFIG = {
  storeName: 'display-app V1.2',

  // Manual upload mode:
  // Leave dataSource empty so no product CSV is hardcoded into GitHub/Netlify.
  // Users upload a CSV in the browser, edit locally, then download the updated CSV.
  dataSource: '',

  currency: 'ISK',
  locale: 'is-IS',
  priceField: 'cost',
  imageField: 'img',
  barcodeField: 'barcodex',
  shelfCodeField: 'shelfcode',
  defaultSort: 'name-asc'
};
