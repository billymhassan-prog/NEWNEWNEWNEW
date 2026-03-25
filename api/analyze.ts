import { get, put } from "@vercel/blob";
import * as XLSX from "xlsx";

const PUBLIC_BLOB_TOKEN = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN!;

// later...
const blobResult = await get(pathname, {
  access: "public",
  token: PUBLIC_BLOB_TOKEN,
});

// later...
await put(processedPathname, JSON.stringify(processedPayload, null, 2), {
  access: "public",
  token: PUBLIC_BLOB_TOKEN,
  addRandomSuffix: false,
  contentType: "application/json",
});
