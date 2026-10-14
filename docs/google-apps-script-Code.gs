const SHEET_NAME = "Orders";
const API_SECRET = "Sec-xnMakhsjjnMKjs";

const HEADERS = [
  "Order ID", "Created At", "Customer Name", "Mobile", "File Name",
  "Drive File URL", "Page Count", "Copies", "Colour", "Paper Size",
  "Print Side", "Amount", "Payment Status", "Order Status", "Admin Note",
  "Approved At", "Approved By", "Last Updated", "Print Status",
  "Printed At", "Print Error", "Drive File ID", "Print Claimed At"
];

function doGet() {
  return jsonResponse({ success: true, message: "Smart Print Center API is running" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      throw new Error("Request body is missing");
    }

    const data = JSON.parse(e.postData.contents);

    if (!API_SECRET || API_SECRET === "PASTE_THE_SAME_SECRET_USED_IN_ENV_LOCAL") {
      throw new Error("API secret has not been configured");
    }

    if (typeof data.apiSecret !== "string" || data.apiSecret !== API_SECRET) {
      throw new Error("Unauthorized request");
    }

    const action = String(data.action || "create");

    if (action === "create") return createOrder(data);
    if (action === "list") return listOrders();
    if (action === "updateStatus") return updateOrderStatus(data);
    if (action === "claimNextPrint") return claimNextPrint();
    if (action === "updatePrint") return updatePrintStatus(data);
    if (action === "delete") return deleteOrder(data);

    throw new Error("Unknown request action");
  } catch (error) {
    console.error("Order API error: " + error.message);
    return jsonResponse({ success: false, message: error.message || "Unable to process order" });
  }
}

function getOrdersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet && spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) throw new Error("Orders sheet not found");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const updatedHeaders = HEADERS.map((header, index) => existingHeaders[index] || header);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([updatedHeaders]);
  }
  return sheet;
}

function createOrder(data) {
  const customerName = String(data.customerName || "").trim();
  const mobile = String(data.mobile || "").trim();
  const fileName = String(data.fileName || "").trim();
  const fileId = String(data.fileId || "").trim();
  const fileUrl = String(data.fileUrl || "").trim();
  const colorMode = String(data.colorMode || "");
  const paperSize = String(data.paperSize || "");
  const printSide = String(data.printSide || "");
  const pageCount = Number(data.pageCount);
  const copies = Number(data.copies);

  if (!customerName || !fileName || !fileId || !fileUrl) {
    throw new Error("Customer name and uploaded document are required");
  }
  if (customerName.length > 100 || fileName.length > 255) {
    throw new Error("Customer name or file name is too long");
  }
  if (mobile.length > 20 || (mobile && !/^[0-9+\-\s]{7,20}$/.test(mobile))) {
    throw new Error("Invalid mobile number");
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 500) {
    throw new Error("Invalid page count");
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
    throw new Error("Invalid number of copies");
  }
  if (!["Black & White", "Colour"].includes(colorMode)) throw new Error("Invalid color mode");
  if (!["A4", "A3"].includes(paperSize)) throw new Error("Invalid paper size");
  if (!["Single Side", "Double Side"].includes(printSide)) throw new Error("Invalid print side");

  const totalAmount = pageCount * copies * (colorMode === "Colour" ? 10 : 2);
  const orderId = Utilities.getUuid();
  const now = new Date();

  getOrdersSheet().appendRow([
    orderId, now, safeCell(customerName), safeCell(mobile), safeCell(fileName),
    safeCell(fileUrl), pageCount, copies, colorMode, paperSize, printSide,
    totalAmount, "OFF", "PENDING", "", "", "", now,
    "", "", "", safeCell(fileId)
  ]);

  return jsonResponse({
    success: true, orderId, status: "PENDING", paymentStatus: "OFF",
    estimatedAmount: totalAmount, message: "Print request created successfully"
  });
}

function listOrders() {
  const sheet = getOrdersSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return jsonResponse({ success: true, orders: [] });

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const timezone = Session.getScriptTimeZone();
  const orders = rows
    .filter(row => row[0])
    .map(row => ({
      orderId: String(row[0]),
      createdAt: row[1] instanceof Date ? Utilities.formatDate(row[1], timezone, "yyyy-MM-dd HH:mm") : String(row[1] || ""),
      customerName: String(row[2] || ""), mobile: String(row[3] || ""),
      fileName: String(row[4] || ""), fileUrl: String(row[5] || ""),
      pageCount: Number(row[6] || 0), copies: Number(row[7] || 0),
      colorMode: String(row[8] || ""), paperSize: String(row[9] || ""),
      printSide: String(row[10] || ""), totalAmount: Number(row[11] || 0),
      paymentStatus: String(row[12] || "OFF"), status: String(row[13] || "PENDING"),
      adminNote: String(row[14] || ""), printStatus: String(row[18] || ""),
      printedAt: row[19] instanceof Date ? Utilities.formatDate(row[19], timezone, "yyyy-MM-dd HH:mm") : String(row[19] || ""),
      printError: String(row[20] || "")
    }))
    .reverse();

  return jsonResponse({ success: true, orders });
}

function updateOrderStatus(data) {
  const orderId = String(data.orderId || "").trim();
  const status = String(data.status || "").trim();
  const adminNote = String(data.adminNote || "").trim();
  const adminName = String(data.adminName || "Admin").trim();

  if (!orderId || !["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("Invalid order update");
  }

  const sheet = getOrdersSheet();
  const match = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
    .createTextFinder(orderId).matchEntireCell(true).findNext();

  if (!match) throw new Error("Order not found");

  const row = match.getRow();
  const now = new Date();
  sheet.getRange(row, 14, 1, 6).setValues([[
    status, safeCell(adminNote), status === "APPROVED" ? now : "",
    safeCell(adminName), now, status === "APPROVED" ? "QUEUED" : ""
  ]]);

  return jsonResponse({ success: true, orderId, status, message: "Order updated" });
}

function claimNextPrint() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getOrdersSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return jsonResponse({ success: true, order: null });

    const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const index = rows.findIndex(row =>
      String(row[13]) === "APPROVED" &&
      (
        ["", "QUEUED"].includes(String(row[18])) ||
        (String(row[18]) === "PRINTING" && row[22] instanceof Date && row[22] < staleBefore)
      )
    );

    if (index === -1) return jsonResponse({ success: true, order: null });

    const rowNumber = index + 2;
    const row = rows[index];
    sheet.getRange(rowNumber, 19, 1, 3).setValues([["PRINTING", "", ""]]);
    sheet.getRange(rowNumber, 23).setValue(new Date());

    return jsonResponse({
      success: true,
      order: {
        orderId: String(row[0]), fileName: String(row[4]),
        fileUrl: String(row[5]), fileId: String(row[21] || ""),
        copies: Number(row[7] || 1), colorMode: String(row[8] || ""),
        paperSize: String(row[9] || "A4"), printSide: String(row[10] || "Single Side")
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function updatePrintStatus(data) {
  const orderId = String(data.orderId || "").trim();
  const printStatus = String(data.printStatus || "").trim();
  const printError = String(data.printError || "").trim();

  if (!orderId || !["QUEUED", "MANUAL_PRINTING", "PRINTED", "PRINT_FAILED"].includes(printStatus)) {
    throw new Error("Invalid print update");
  }

  const sheet = getOrdersSheet();
  const match = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
    .createTextFinder(orderId).matchEntireCell(true).findNext();

  if (!match) throw new Error("Order not found");

  const now = new Date();
  sheet.getRange(match.getRow(), 19, 1, 3).setValues([[
    printStatus, printStatus === "PRINTED" ? now : "", safeCell(printError)
  ]]);
  sheet.getRange(match.getRow(), 23).setValue("");
  sheet.getRange(match.getRow(), 18).setValue(now);

  return jsonResponse({ success: true, orderId, printStatus });
}

function deleteOrder(data) {
  const orderId = String(data.orderId || "").trim();
  if (!orderId) throw new Error("Order ID is required");

  const sheet = getOrdersSheet();
  const match = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
    .createTextFinder(orderId).matchEntireCell(true).findNext();

  if (!match) throw new Error("Order not found");

  sheet.deleteRow(match.getRow());
  return jsonResponse({ success: true, orderId, message: "Order deleted" });
}

function safeCell(value) {
  const text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
