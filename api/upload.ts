import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const PUBLIC_BLOB_TOKEN = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN!;

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const ALLOWED_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "application/octet-stream",
];

function hasAllowedExtension(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      token: PUBLIC_BLOB_TOKEN,
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!hasAllowedExtension(pathname)) {
          throw new Error("Only .xlsx, .xls, and .csv files are allowed.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ purpose: "team-dashboard-upload" }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.pathname);
      },
    });

    return Response.json(jsonResponse);
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "Could not start upload." },
      { status: 400 }
    );
  }
}
