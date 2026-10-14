# Windows print agent

This agent runs on the Windows PC connected to the printer. It claims one approved PDF at a time from the Google Apps Script API, downloads the PDF from Google Drive, submits it through SumatraPDF, and records `PRINTED` or `PRINT_FAILED` in the sheet.

## Before starting

1. Install the target printer's Windows driver and confirm a Windows test page prints.
2. Install SumatraPDF. Its default executable path is `C:\Program Files\SumatraPDF\SumatraPDF.exe`.
3. In `docs/google-apps-script-Code.gs`, replace the deployed Apps Script with the current version and redeploy it as a web app. The execution identity must have access to the Orders sheet.
4. Share the Drive upload folder with the Google account used by the agent, or use the same OAuth account that uploaded the files.

## Agent environment

Create a private file such as `print-agent/config.env` on the printer PC (it is gitignored):

```env
PRINT_AGENT_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
PRINT_AGENT_API_SECRET=the_same_secret_as_APPS_SCRIPT
PRINT_AGENT_PRINTER=Exact Windows printer name
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
SUMATRA_PDF_PATH=C:\Program Files\SumatraPDF\SumatraPDF.exe
PRINT_AGENT_POLL_INTERVAL_MS=10000
```

Use the existing `scripts/get-drive-token.mjs` on that PC to obtain a Drive refresh token if needed. Keep the config file, OAuth credentials, and API secret private.

## Run

From the project directory in PowerShell:

```powershell
Get-Content print-agent/config.env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
node scripts/windows-print-agent.mjs
```

The agent marks an order `PRINTED` after SumatraPDF successfully submits it to the Windows print queue. A printer queue accepting a job does not guarantee that paper was physically produced; paper/toner/jam faults must still be monitored on the printer.

An order left at `PRINTING` for 15 minutes is eligible to be reclaimed. This covers a PC or agent crash, but it can cause a duplicate print if a job actually reached the printer just before the crash.

## Manual printing fallback

In the admin dashboard, approve the order, then select **Manual Print**. This changes its print state to `MANUAL_PRINTING`, so the automatic agent cannot claim it. The document opens in a new tab; use `Ctrl+P` to choose the printer and settings. After the physical print completes, click **Mark Printed** in the dashboard.
