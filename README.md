# Trade Journal Portal

A lightweight trader-focused web portal to:
- Add/edit/delete trade logs.
- Track day/week/year and running profit/loss percentages.
- Color-code winners and losers.
- Import data from Excel/CSV files.
- Save entries to local files (or download JSON export).

## Run locally

Open `index.html` in a modern browser.

> For best local folder save support, use Chromium-based browsers (File System Access API).

## Expected import columns

The importer accepts flexible names (case-insensitive), including:
- `Date`
- `Expiration date`
- `Ticker`
- `Entry price`
- `Exit price`
- `ProfitLoss percentage` / `P/L%`
- `Reason for trade`
