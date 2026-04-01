# Trade Journal Portal

A lightweight trader-focused web portal to:
- Add/edit/delete trade logs.
- Track day/week/year and running profit/loss percentages.
- Color-code winners and losers.
- Import data from Excel/CSV files.
- Save entries to local files (or download JSON export).

## Run locally

Open `index.html` in a modern browser.
Open `requirements.html` to view a dedicated requirements/spec page.

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

`Profit/Loss %` is auto-calculated from entry and exit prices during manual entry.


## Python server (optional)

If you want a Python entrypoint, run:

```bash
python3 server.py --host 127.0.0.1 --port 8000
```

API endpoints:
- `GET /api/trades` -> returns saved trades from `data/trades.json`
- `POST /api/trades` -> saves an array of trades to `data/trades.json`
