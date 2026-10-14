import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Admin login required." },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
