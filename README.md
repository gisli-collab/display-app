# kronan-display-app.v1.8

Static Netlify product display app for local CSV review, shelf/status workflow, barcode handling, shared default CSV storage, and active-only CSV export.

## What changed in v1.8

- App name changed to **kronan-display-app.v1.8**.
- Default CSV saving was rebuilt to try both Netlify Function routes:
  - `/.netlify/functions/save-default-csv`
  - `/api/save-default-csv`
- Added explicit Netlify configuration so Functions are deployed from `netlify/functions`.
- Added `_redirects` so `/api/default-csv` and `/api/save-default-csv` route to the Netlify Functions.
- The shared default CSV save includes the full CSV, so barcode, shelfcode, status/active, and price changes are all persisted to Netlify Blobs.

## Important deploy note

GitHub must contain these folders exactly:

```text
netlify/functions/default-csv.js
netlify/functions/save-default-csv.js
data/default-products.csv
```

If `save-default-csv.js` is uploaded at the repo root instead of inside `netlify/functions`, Netlify will not expose `/.netlify/functions/save-default-csv`, and saving will return HTTP 404.

## Workflow

1. Deploy the repo to Netlify.
2. Click **Load default CSV**.
3. Edit barcode, shelfcode, status, or price.
4. The app auto-saves the full updated default CSV to Netlify Blobs.
5. Use **Save default CSV** to force a manual save.
6. Use **Download updated CSV** as a backup/export.

The GitHub CSV is only the bundled fallback/start file. The live shared version is stored in Netlify Blobs.
