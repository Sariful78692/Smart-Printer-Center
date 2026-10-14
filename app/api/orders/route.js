import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      customerName,
      mobile = "",
      fileName,
      fileId = "",
      fileUrl = "",
      fileSize = 0,
      fileMimeType = "",
      pageCount = 1,
      copies = 1,
      colorMode,
      paperSize,
      printSide,
    } = body;

    // Required fields
    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof fileName !== "string" ||
      !fileName.trim() ||
      typeof fileId !== "string" ||
      !fileId.trim() ||
      typeof fileUrl !== "string" ||
      !fileUrl.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name and uploaded document are required.",
        },
        { status: 400 }
      );
    }

    // Validate mobile number format if provided
    if (
      typeof mobile !== "string" ||
      (mobile && !/^[0-9+\-\s]{7,20}$/.test(mobile))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid mobile number.",
        },
        { status: 400 }
      );
    }

    // Validate page count and copies
    if (
      !Number.isInteger(pageCount) ||
      pageCount < 1 ||
      pageCount > 500 ||
      !Number.isInteger(copies) ||
      copies < 1 ||
      copies > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid page count or copies.",
        },
        { status: 400 }
      );
    }

    // Validate print options
    if (!["Black & White", "Colour"].includes(colorMode)) {
      return NextResponse.json(
        { success: false, message: "Invalid colour mode." },
        { status: 400 }
      );
    }

    if (!["A4", "A3"].includes(paperSize)) {
      return NextResponse.json(
        { success: false, message: "Invalid paper size." },
        { status: 400 }
      );
    }

    if (!["Single Side", "Double Side"].includes(printSide)) {
      return NextResponse.json(
        { success: false, message: "Invalid print side." },
        { status: 400 }
      );
    }

    const apiUrl = process.env.GOOGLE_SHEETS_API_URL;
    const apiSecret = process.env.GOOGLE_SHEETS_API_SECRET;

    if (!apiUrl || !apiSecret) {
      console.error("Google Sheets environment variables are missing.");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    // Calculate the price on the server.
    // These are demo rates and can be changed later.
    const pricePerPage = colorMode === "Colour" ? 10 : 2;
    const totalAmount = pageCount * copies * pricePerPage;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        apiSecret,
        customerName: customerName.trim(),
        mobile: mobile.trim(),
        fileName: fileName.trim(),
        fileId: fileId.trim(),
        fileUrl: fileUrl.trim(),
        fileSize: Number.isFinite(fileSize) ? fileSize : 0,
        fileMimeType:
          typeof fileMimeType === "string" ? fileMimeType.trim() : "",
        pageCount,
        copies,
        colorMode,
        paperSize,
        printSide,
      }),
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error("Google Sheets request failed.");
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Google Sheets rejected the order.");

      return NextResponse.json(
        {
          success: false,
          message: "The order could not be saved.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: "PENDING",
      paymentStatus: "OFF",
      estimatedAmount: totalAmount,
      message: "Your print request has been submitted.",
    });
  } catch (error) {
    console.error("Order submission failed:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit the order. Please try again.",
      },
      { status: 500 }
    );
  }
}
