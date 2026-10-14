import { NextResponse } from "next/server";
import { callOrdersSheet, isAdminRequest } from "../../../../lib/admin";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Admin login required." },
      { status: 401 }
    );
  }

  try {
    const result = await callOrdersSheet({ action: "list" });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Loading admin orders failed:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Orders could not be loaded.",
      },
      { status: 502 }
    );
  }
}
