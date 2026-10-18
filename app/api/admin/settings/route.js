import { NextResponse } from "next/server";
import { callOrdersSheet, isAdminRequest } from "../../../../lib/admin";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await callOrdersSheet({ action: "getSettings" }));
  } catch (error) {
    console.error("Loading printer settings failed:", error.message);
    return NextResponse.json({ success: false, message: error.message || "Printer settings could not be loaded." }, { status: 502 });
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }

  try {
    const { printers, defaultPrinter } = await request.json();
    if (!Array.isArray(printers) || typeof defaultPrinter !== "string") {
      return NextResponse.json({ success: false, message: "Invalid printer settings." }, { status: 400 });
    }
    return NextResponse.json(await callOrdersSheet({
      action: "savePrinterSettings",
      printers,
      defaultPrinter,
    }));
  } catch (error) {
    console.error("Saving printer settings failed:", error.message);
    return NextResponse.json({ success: false, message: error.message || "Printer settings could not be saved." }, { status: 502 });
  }
}
