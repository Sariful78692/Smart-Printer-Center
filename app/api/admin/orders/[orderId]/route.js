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
    const { status, printStatus, adminNote = "", adminName = "Admin" } = await request.json();

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
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Order could not be deleted.",
      },
      { status: 502 }
    );
  }
}
