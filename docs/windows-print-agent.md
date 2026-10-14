# Windows print agent

This agent runs on the Windows PC connected to the printer. It claims one approved PDF at a time from the Google Apps Script API, downloads the PDF from Google Drive, submits it through SumatraPDF, and records `PRINTED` or `PRINT_FAILED` in the sheet.

## Before starting

1. Install the target printer's Windows driver and confirm a Windows test page prints.
2. Install SumatraPDF. Its default executable path is `C:\Program Files\SumatraPDF\SumatraPDF.exe`.
3. In `docs/google-apps-script-Code.gs`, replace the deployed Apps Script with the current version and redeploy it as a web app. The execution identity must have access to the Orders sheet.
4. Share the Drive upload folder with the Google account used by the agent, or use the same OAuth account that uploaded the files.

## Agent environment

The agent loads the existing private `.env.local` automatically. Add these two printer-specific values to it:

```env
PRINT_AGENT_PRINTER=Exact Windows printer name
SUMATRA_PDF_PATH=C:\Program Files\SumatraPDF\SumatraPDF.exe
```

It reuses `GOOGLE_SHEETS_API_URL`, `GOOGLE_SHEETS_API_SECRET`, and the existing Drive OAuth values. `PRINT_AGENT_API_URL` and `PRINT_AGENT_API_SECRET` are optional overrides. Use the existing `scripts/get-drive-token.mjs` on that PC to obtain a Drive refresh token if needed. Keep the config file, OAuth credentials, and API secret private.

## Run

From the project directory in PowerShell:

```powershell
npm.cmd run print-agent
```

The agent marks an order `PRINTED` after SumatraPDF successfully submits it to the Windows print queue. A printer queue accepting a job does not guarantee that paper was physically produced; paper/toner/jam faults must still be monitored on the printer.

An order left at `PRINTING` for 15 minutes is eligible to be reclaimed. This covers a PC or agent crash, but it can cause a duplicate print if a job actually reached the printer just before the crash.

## Manual printing fallback

In the admin dashboard, approve the order, then select **Manual Print**. This changes its print state to `MANUAL_PRINTING`, so the automatic agent cannot claim it. The document opens in a new tab; use `Ctrl+P` to choose the printer and settings. After the physical print completes, click **Mark Printed** in the dashboard.
