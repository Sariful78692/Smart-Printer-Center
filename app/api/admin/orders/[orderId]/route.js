import { NextResponse } from "next/server";
import { callOrdersSheet, isAdminRequest } from "../../../../../lib/admin";

export async function PATCH(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Admin login required." },
      { status: 401 }
    );
  }

  try {
    const { orderId } = await params;
    const { status, printStatus, adminNote = "", adminName = "Admin", printerName = "" } = await request.json();

    if (printStatus) {
      if (!["QUEUED", "MANUAL_PRINTING", "PRINTED"].includes(printStatus)) {
        return NextResponse.json(
          { success: false, message: "Invalid print status." },
          { status: 400 }
        );
      }

      const result = await callOrdersSheet({
        action: "updatePrint",
        orderId,
        printStatus,
      });

      return NextResponse.json(result);
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid order status." },
        { status: 400 }
      );
    }

    const result = await callOrdersSheet({
      action: "updateStatus",
      orderId,
      status,
      adminNote,
      adminName,
      printerName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Updating order failed:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Order could not be updated.",
      },
      { status: 502 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Admin login required." },
      { status: 401 }
    );
  }

  try {
    const { orderId } = await params;
    const result = await callOrdersSheet({ action: "delete", orderId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Deleting order failed:", error.message);
    const message = error.message === "Unknown request action"
      ? "Delete is not enabled in the deployed Google Apps Script yet. Redeploy the latest docs/google-apps-script-Code.gs web app, then try again."
      : error.message || "Order could not be deleted.";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 502 }
    );
  }
}
