import { get, put } from "@vercel/blob";
import * as XLSX from "xlsx";

const PUBLIC_BLOB_TOKEN = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN!;

type AnalyzeRequestBody = {
  pathname?: string;
  fileName?: string;
};

type SheetData = {
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

function jsonError(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  return await new Response(stream).arrayBuffer();
}

function safeFileName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.split("/").pop() || name;
}

function parseWorkbook(arrayBuffer: ArrayBuffer): {
  sheetNames: string[];
  sheets: Record<string, SheetData>;
  summary: Array<{
    sheetName: string;
    rowCount: number;
    columns: string[];
  }>;
} {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheets: Record<string, SheetData> = {};
  const summary: Array<{
    sheetName: string;
    rowCount: number;
    columns: string[];
  }> = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: false,
    });

    const firstRow = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
      sheetRows: 1,
    });

    const columns =
      Array.isArray(firstRow[0]) && firstRow[0].length
        ? firstRow[0].map((value) => String(value ?? "").trim()).filter(Boolean)
        : [];

    sheets[sheetName] = {
      rowCount: rows.length,
      columns,
      rows,
    };

    summary.push({
      sheetName,
      rowCount: rows.length,
      columns,
    });
  }

  return {
    sheetNames: workbook.SheetNames,
    sheets,
    summary,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { pathname, fileName } = body;

    if (!pathname) {
      return jsonError("pathname is required.");
    }

    const blobResult = await get(pathname, {
      access: "public",
      token: PUBLIC_BLOB_TOKEN,
    });

    if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
      return jsonError("Uploaded file not found.", 404);
    }

    const arrayBuffer = await streamToArrayBuffer(blobResult.stream);
    const parsed = parseWorkbook(arrayBuffer);

    const version = new Date().toISOString();
    const processedPathname = `processed/${version.replace(/[:.]/g, "-")}.json`;

    const processedPayload = {
      success: true,
      version,
      processedAt: version,
      source: {
        pathname,
        fileName: safeFileName(fileName) ?? safeFileName(pathname),
        size: blobResult.blob.size,
        contentType: blobResult.blob.contentType,
        uploadedAt: blobResult.blob.uploadedAt,
      },
      workbook: {
        sheetNames: parsed.sheetNames,
        totalSheets: parsed.sheetNames.length,
      },
      summary: parsed.summary,
      sheets: parsed.sheets,
    };

    await put(processedPathname, JSON.stringify(processedPayload, null, 2), {
      access: "public",
      token: PUBLIC_BLOB_TOKEN,
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return Response.json({
      success: true,
      version,
      processedPathname,
      summary: parsed.summary,
    });
  } catch (error: any) {
    console.error("ANALYZE ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Analyze failed.",
      },
      { status: 500 }
    );
  }
}
