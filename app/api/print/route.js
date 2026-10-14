
import { Readable } from "node:stream";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
]);

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function getFolderId(value) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("http")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const match = url.pathname.match(/\/folders\/([^/]+)/);

    return match?.[1] || "";
  } catch {
    return "";
  }
}

function createDriveClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive credentials are missing.");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const document = formData.get("document");

    if (!(document instanceof File) || document.size === 0) {
      return NextResponse.json(
        { success: false, message: "A document is required." },
        { status: 400 }
      );
    }

    if (document.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size must be 10 MB or less." },
        { status: 400 }
      );
    }

    if (!ALLOWED_EXTENSIONS.has(getExtension(document.name))) {
      return NextResponse.json(
        { success: false, message: "Unsupported file type." },
        { status: 400 }
      );
    }

    const drive = createDriveClient();
    const folderId = getFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);

    if (process.env.GOOGLE_DRIVE_FOLDER_ID && !folderId) {
      return NextResponse.json(
        { success: false, message: "Google Drive folder ID is invalid." },
        { status: 500 }
      );
    }
    const bytes = Buffer.from(await document.arrayBuffer());
    const upload = await drive.files.create({
      requestBody: {
        name: document.name,
        ...(folderId ? { parents: [folderId] } : {}),
      },
      media: {
        mimeType: document.type || "application/octet-stream",
        body: Readable.from(bytes),
      },
      fields: "id,name,webViewLink",
    });

    if (!upload.data.id) {
      throw new Error("Google Drive did not return a file ID.");
    }

    return NextResponse.json({
      success: true,
      fileId: upload.data.id,
      fileName: upload.data.name || document.name,
      fileUrl:
        upload.data.webViewLink ||
        `https://drive.google.com/file/d/${upload.data.id}/view`,
      fileSize: document.size,
      fileMimeType: document.type || "application/octet-stream",
    });
  } catch (error) {
    console.error("Google Drive upload failed:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Document upload failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
