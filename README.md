# display-app V1.2

Manual CSV product display app for Netlify.

This version does not include hardcoded product data. The app starts empty, then you upload a CSV in the browser.

## Main features

- Upload a product CSV manually in the browser.
- Search, filter, and sort products.
- Scan or type a barcode to open an existing product.
- Edit product price locally.
- Set or fix the product `shelfcode` by clicking a dot on the store map.
- Download the updated CSV after price or shelfcode changes.

## CSV fields

The app works best with these fields:

```text
name, weight, brand, img, cost, ingredients, categories, store_categories, barcodex, status, shelfcode
```

The important configurable fields are in `config.js`:

```js
priceField: 'cost'
imageField: 'img'
barcodeField: 'barcodex'
shelfCodeField: 'shelfcode'
storeMapImage: 'store-map.png'
```

If your uploaded CSV does not have a `shelfcode` column, the app will add it when you download the updated CSV.

## Shelfcode map

Open a product and use the shelfcode map to select a location such as `A100`, `B300`, or `K400`. The selected shelfcode is saved into the product row locally. Click **Download updated CSV** to keep the change.

## Price editing

Open a product, change the price, and click **Update price locally**. Then click **Download updated CSV** to keep the change.

## Barcode scanner

The barcode lookup supports:

- Normal EAN/UPC style barcodes.
- GTIN aliases such as EAN-13 and GTIN-14 with leading-zero handling.
- GS1 labels that include `(01)` GTIN.
- Variable-weight EAN-13 codes starting with `23`.

The camera scanner uses `html5-qrcode` from a CDN, so camera scanning needs internet access and HTTPS, such as Netlify.

## Files to upload to GitHub

Upload these files and folders:

```text
index.html
app.js
styles.css
config.js
netlify.toml
package.json
README.md
store-map.png
```

Do not upload product CSV files if you want the app to stay empty until manual upload.

## Files to delete from older versions

Delete these if they exist:

```text
data/products.csv
products.csv
products.js
assets/placeholder.svg
assets/store-map.png
netlify/functions/products.js
netlify/functions/update-price.js
```

## Netlify settings

```text
Build command: leave empty, or use npm run build
Publish directory: .
```
