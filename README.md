# display-app.v1.9

Static Netlify product display app for manual CSV/JSON upload with a full-screen product detail editor.

In v1.9 the camera scanner was swapped from `html5-qrcode` to a BarcodeDetector-based scanner, matching the detector path used by `vue-qrcode-reader` / `QrcodeStream`. The product detail editor remains fixed to the visible viewport, so opening a product starts at the top even when the product grid is scrolled down.

## What it does

- Upload a CSV in the browser, or import a generated product JSON file. No product data is hardcoded in GitHub.
- Search, filter, sort, and open products.
- Scan or type a barcode to open an existing product. Camera scanning now uses the Barcode Detection API with the `barcode-detector` ponyfill fallback.
- Open a product in a full-screen detail view pinned to the viewport, reset to the top every time.
- Update price locally.
- Select a shelfcode from the clickable `store-map.png` overlay, then update the shelfcode locally.
- Activate/deactivate a product locally using the `status` field. `1` means activated and `2` means deactivated.
- Download the updated CSV when you want to save the changes outside the browser.

## CSV / JSON fields

The app works best with these fields from CSV, or equivalent keys in JSON:

- `name`
- `brand`
- `weight` / `weight_or_volume`
- `img` / `image`
- `barcodex` / `barcode`
- `cost` / `price`
- `shelfcode`
- `status`

If `shelfcode` or `status` are missing, the downloaded CSV will include them once you save edits.

## Barcode scanner

The static app does not run Vue, so it cannot mount `QrcodeStream` directly. Instead, v1.9 uses the same scanner foundation: the browser `BarcodeDetector` API with the `barcode-detector` ponyfill loaded from jsDelivr when native `BarcodeDetector` is missing.

Configured scan formats:

- `qr_code`
- `ean_13`
- `ean_8`
- `code_128`
- `code_39`
- `databar_expanded`
- `databar`
- `upc_a`
- `upc_e`

## Deploy to Netlify

Upload these files to GitHub:

```text
README.md
app.js
config.js
index.html
netlify.toml
package.json
store-map.png
styles.css
```

No build command is required. Publish directory should be:

```text
.
```

## JSON import

The manual upload area includes an **Import JSON file** control. It supports a single generated product object such as `{ "product": { ... } }`, a flat product object, or arrays under `products`, `data`, `rows`, or `items`. The importer maps `price` to `cost`, `image` to `img`, `barcode` to `barcodex`, and `weight_or_volume` to `weight` so the existing product viewer and CSV downloader continue to work.

## Saving changes

This is a static/manual CSV app. Changes are saved in the browser only until you click **Download updated CSV**. Replace your external CSV with that downloaded file when you want to keep the changes.
