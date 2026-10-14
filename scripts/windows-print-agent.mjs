/**
 * Windows print agent for Smart Printer Center.
 * Claims one approved PDF at a time from Apps Script, downloads it from Drive,
 * submits it to the selected printer through SumatraPDF, then reports its status.
 */
import { spawn } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { google } from "googleapis";

// Allows the agent to run with the same private configuration as the web app.
// Explicit process environment variables still take precedence.
try {
  process.loadEnvFile(path.resolve(".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const required = [
  "PRINT_AGENT_PRINTER",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN",
];

for (const key of required) {
  if (!process.env[key]?.trim()) {
    throw new Error(`${key} is required. Set it in the print agent environment.`);
  }
}

const apiUrl = (process.env.PRINT_AGENT_API_URL || process.env.GOOGLE_SHEETS_API_URL || "").trim();
const apiSecret = (process.env.PRINT_AGENT_API_SECRET || process.env.GOOGLE_SHEETS_API_SECRET || "").trim();
if (!apiUrl || !apiSecret) {
  throw new Error("Set PRINT_AGENT_API_URL/PRINT_AGENT_API_SECRET or GOOGLE_SHEETS_API_URL/GOOGLE_SHEETS_API_SECRET.");
}
const printer = process.env.PRINT_AGENT_PRINTER.trim();
const pollIntervalMs = positiveInt(process.env.PRINT_AGENT_POLL_INTERVAL_MS, 10000);
const workDir = path.resolve(process.env.PRINT_AGENT_WORK_DIR || path.join(os.tmpdir(), "smart-printer-center"));
const sumatraPath = process.env.SUMATRA_PDF_PATH || "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe";

await access(sumatraPath, constants.X_OK).catch(() => {
  throw new Error(`SumatraPDF was not found at: ${sumatraPath}`);
});
await mkdir(workDir, { recursive: true });

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });

console.log(`Print agent started. Printer: ${printer}. Poll interval: ${pollIntervalMs} ms.`);

// Run continuously. Each order is claimed by Apps Script under a lock.
while (true) {
  try {
    const order = await claimNextPrint();
    if (!order) {
      await delay(pollIntervalMs);
      continue;
    }

    await printOrder(order);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Agent error: ${error.message}`);
    await delay(pollIntervalMs);
  }
}

async function claimNextPrint() {
  const result = await callOrderApi({ action: "claimNextPrint" });
  return result.order || null;
}

async function printOrder(order) {
  try {
    const fileId = order.fileId || getDriveFileId(order.fileUrl);
    if (!fileId) throw new Error("Order has no Google Drive file ID or usable file URL.");
    if (!/\.pdf$/i.test(order.fileName || "")) {
      throw new Error("Only PDF orders can be printed by this agent.");
    }

    const localPdf = path.join(workDir, `${safeFilePart(order.orderId)}.pdf`);
    await downloadPdf(fileId, localPdf);
    await runSumatra(localPdf, order);
    await callOrderApi({ action: "updatePrint", orderId: order.orderId, printStatus: "PRINTED" });
    console.log(`Printed order ${order.orderId}.`);
    await rm(localPdf, { force: true });
  } catch (error) {
    const message = String(error.message || error).slice(0, 500);
    console.error(`Order ${order.orderId} failed: ${message}`);
    try {
      await callOrderApi({
        action: "updatePrint",
        orderId: order.orderId,
        printStatus: "PRINT_FAILED",
        printError: message,
      });
    } catch (statusError) {
      console.error(`Could not report failure for ${order.orderId}: ${statusError.message}`);
    }
  }
}

async function downloadPdf(fileId, destination) {
  const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  await writeFile(destination, Buffer.from(response.data));
}

function runSumatra(pdfPath, order) {
  const settings = [
    `copies=${positiveInt(order.copies, 1)}`,
    order.colorMode === "Colour" ? "color" : "monochrome",
    order.printSide === "Double Side" ? "duplexlong" : "simplex",
    `paper=${order.paperSize === "A3" ? "A3" : "A4"}`,
  ].join(",");

  return new Promise((resolve, reject) => {
    const child = spawn(sumatraPath, [
      "-silent",
      "-exit-on-print",
      "-print-to", printer,
      "-print-settings", settings,
      pdfPath,
    ], { windowsHide: true });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`SumatraPDF exited with code ${code ?? "unknown"}.`));
    });
  });
}

async function callOrderApi(payload) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, apiSecret }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Order API request failed (${response.status}).`);
  }
  return data;
}

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getDriveFileId(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/d\/([^/]+)/);
    return pathMatch?.[1] || url.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
