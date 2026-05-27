window.STORE_DISPLAY_CONFIG = {
  storeName: 'display-app.v1.3',

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
  statusField: 'status',
  activeStatusValue: '1',
  inactiveStatusValue: '2',
  // The store map image is expected in the repo root.
  storeMapImage: 'store-map.png',
  defaultSort: 'name-asc'
};
