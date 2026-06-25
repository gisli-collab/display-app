window.STORE_DISPLAY_CONFIG = {
  storeName: 'kronan-display-app.v1.8',

  // Manual upload mode remains available. The shared default CSV is loaded via Netlify Functions and saved to Netlify Blobs.
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
  // The store map image is expected in the repo root.
  storeMapImage: 'store-map.png',
  defaultSort: 'name-asc'
};
