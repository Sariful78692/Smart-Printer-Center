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
    const { status, adminNote = "", adminName = "Admin" } = await request.json();

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
