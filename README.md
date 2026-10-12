# DSA Vault

Personal static DSA tracker built from the uploaded Striver A2Z dataset.

## Contents
- `index.html` — page structure
- `styles.css` — styling
- `app.js` — search, filters, progress, import/export
- `data/problems.json` — 402 ordered problems converted from the supplied JSON
- `data/source-meta.json` — source metadata and module counts

## Run locally
From this directory, run:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to Vercel
Import this folder/repository into Vercel as a static project. No build command is needed.

## Progress
Solved IDs are stored in this browser's local storage. Export progress regularly to back it up or transfer it to another browser. Importing a backup only restores IDs that exist in the currently loaded dataset.

## Dataset notes
- The converted data preserves source problem order, titles, module names, subtopics, difficulty where present, and direct URLs found in the uploaded source file.
- It does not invent LeetCode or GFG mappings when the supplied file contains none.
- This is a 402-problem snapshot of the uploaded dataset; it may differ from other versions/counts of Striver's A2Z sheet.
