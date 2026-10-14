import { NextResponse } from "next/server";
import { isValidAdminPassword } from "../../../../lib/admin";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!isValidAdminPassword(password)) {
      return NextResponse.json(
        { success: false, message: "Incorrect admin password." },
        { status: 401 }
      );
    }

    const sessionToken = process.env.ADMIN_SESSION_TOKEN;

    if (!sessionToken) {
      throw new Error("Admin session token is not configured.");
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("smart_print_admin", sessionToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return NextResponse.json(
      { success: false, message: "Admin login is not configured." },
      { status: 500 }
    );
  }
}
