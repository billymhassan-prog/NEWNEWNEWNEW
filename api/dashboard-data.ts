import { get, list } from "@vercel/blob";

const PUBLIC_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

function jsonError(message: string, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

async function readJson(pathname: string) {
  const result = await get(pathname, {
    access: "public",
    token: PUBLIC_BLOB_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  return await new Response(result.stream).json();
}

export async function GET() {
  try {
    const { blobs } = await list({
      prefix: "processed/",
      token: _BLOB_TOKEN,
    });

    const candidates = blobs.filter((blob) => blob.pathname.endsWith(".json"));

    if (!candidates.length) {
      return jsonError("No processed dashboard data found yet.", 404);
    }

    const newest = [...candidates].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const data = await readJson(newest.pathname);

    if (!data) {
      return jsonError("Could not read the latest processed dataset.", 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        version: data.version,
        data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("DASHBOARD-DATA ERROR:", error);

    return jsonError(error?.message || "Failed to load dashboard data.", 500);
  }
}
