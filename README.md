# display-app.v1.6

Static Netlify product display app for manual CSV upload with a full-screen product detail editor. In v1.6 the product detail editor is fixed to the visible viewport, so opening a product starts at the top even when the product grid is scrolled down.

## What it does

- Upload a CSV in the browser. No product data is hardcoded in GitHub.
- Search, filter, sort, and open products.
- Scan or type a barcode to open an existing product.
- Open a product in a full-screen detail view pinned to the viewport, reset to the top every time.
- Update price locally.
- Select a shelfcode from the clickable `store-map.png` overlay, then update the shelfcode locally.
- Activate/deactivate a product locally using the `status` field. `1` means activated and `2` means deactivated.
- Download the updated CSV when you want to save the changes outside the browser.

## CSV fields

The app works best with these fields:

- `name`
- `brand`
- `weight`
- `img`
- `barcodex`
- `cost`
- `shelfcode`
- `status`

If `shelfcode` or `status` are missing, the downloaded CSV will include them once you save edits.

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

## Saving changes

This is a static/manual CSV app. Changes are saved in the browser only until you click **Download updated CSV**. Replace your external CSV with that downloaded file when you want to keep the changes.
