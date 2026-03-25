// src/components/UploadModal.tsx  (or wherever your modal lives)
import { upload } from "@vercel/blob/client";
import { useStyletron } from "baseui";
import { useState, useRef } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";
import { Button, SIZE, KIND } from "baseui/button";
import { Notification } from "baseui/notification";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [css] = useStyletron();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Acceptable files
  const handleFile = (f: File) => {
    const name = (f && f.name) || "";
    const lower = name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
      setFile(f);
      setUploaded(false);
      setUploadError(null);
      setProgress(null);
    } else {
      setUploadError("Please choose a .xlsx, .xls or .csv file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  // Real upload that POSTs to /api/upload and shows progress
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploaded(false);
    setUploadError(null);
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append("file", file);

      // Example: if you want to pass metadata from client:
      // fd.append('source', 'manual-upload');

      // Use XHR to capture upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload", true);

        // Optional: set headers here if your API requires them (e.g., auth)
        // xhr.setRequestHeader('x-api-key', '...');

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Try parse JSON to check for server errors
            try {
              const resp = xhr.responseText ? JSON.parse(xhr.responseText) : { success: true };
              if (resp && resp.success === false) {
                reject(new Error(resp.error || "Upload failed on server"));
                return;
              }
            } catch {
              // Non-JSON but 2xx — accept as success
            }
            resolve();
          } else {
            // Try get error message from server response
            let msg = `Upload failed (${xhr.status})`;
            try {
              const json = JSON.parse(xhr.responseText || "{}");
              msg = json.error || msg;
            } catch {}
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.send(fd);
      });

      // Optionally call an analyze/reprocess endpoint after upload.
      // If your /api/upload already processes the file fully, you can skip this.
      try {
        const analyzeResp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "upload" }),
        });
        if (!analyzeResp.ok) {
          // Not fatal — but capture warning
          const text = await analyzeResp.text().catch(() => "");
          console.warn("Analyze returned non-OK", analyzeResp.status, text);
        } else {
          // Optionally inspect JSON
          // const json = await analyzeResp.json();
        }
      } catch (e) {
        console.warn("Analyze call failed:", e);
      }

      setUploading(false);
      setUploaded(true);
      setProgress(100);
      // signal other parts of the app to refresh their data
      window.dispatchEvent(new Event("data:updated"));
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploading(false);
      setUploadError(err?.message || "Upload failed");
      setProgress(null);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploaded(false);
    setUploading(false);
    setUploadError(null);
    setProgress(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overrides={{
        Dialog: { style: { width: "560px", borderRadius: "12px" } },
      }}
    >
      <ModalHeader>
        <div className={css({ fontFamily: "UberMove", fontWeight: 700 })}>Upload Data</div>
      </ModalHeader>

      <ModalBody>
        <div className={css({ fontSize: "13px", color: "#666", fontFamily: "UberMoveText", marginBottom: "12px" })}>
          Upload your team productivity workbook (.xlsx, .xls, or .csv) to refresh the dashboard.
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={css({
            border: `2px dashed ${dragOver ? "#276EF1" : "#D0D0D0"}`,
            borderRadius: "8px",
            padding: "36px 20px",
            textAlign: "center" as const,
            cursor: "pointer",
            backgroundColor: dragOver ? "#F0F5FF" : "#FAFAFA",
            transition: "all 0.15s",
            ":hover": { borderColor: "#276EF1", backgroundColor: "#F8FAFF" },
          })}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
            className={css({ display: "none" })}
          />

          <div className={css({ fontSize: "34px", marginBottom: "8px" })}>📊</div>
          <div className={css({ fontFamily: "UberMoveText", fontWeight: 500, fontSize: "14px", color: "#333" })}>
            {file ? file.name : "Drag & drop your workbook here"}
          </div>
          <div className={css({ fontFamily: "UberMoveText", fontSize: "12px", color: "#888", marginTop: "6px" })}>
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or click to browse · .xlsx, .xls, .csv"}
          </div>
        </div>

        {/* Selected file panel */}
        {file && !uploaded && (
          <div className={css({ marginTop: "16px", padding: "12px", backgroundColor: "#F8F9FA", borderRadius: "6px", border: "1px solid #E8E8E8" })}>
            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
              <div>
                <div className={css({ fontFamily: "UberMoveText", fontWeight: 500, fontSize: "13px" })}>{file.name}</div>
                <div className={css({ fontFamily: "UberMoveText", fontSize: "11px", color: "#888", marginTop: "2px" })}>
                  Ready to process · {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { setFile(null); setUploadError(null); }}>
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Uploading UI */}
        {uploading && (
          <div className={css({ marginTop: "14px" })}>
            <div className={css({ display: "flex", alignItems: "center", gap: "10px" })}>
              {/* small svg spinner */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#276EF1" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" fill="none">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                </circle>
              </svg>
              <div className={css({ fontFamily: "UberMoveText", fontSize: "13px", color: "#276EF1" })}>Uploading workbook...</div>
            </div>

            {progress !== null && (
              <div className={css({ marginTop: 10 })}>
                <div className={css({ height: 8, background: "#eee", borderRadius: 6, overflow: "hidden" })}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "#276EF1" }} />
                </div>
                <div className={css({ fontSize: 12, color: "#666", marginTop: 8 })}>{progress}%</div>
              </div>
            )}
            {uploadError && <div className={css({ color: "#E11900", marginTop: 8, fontSize: 13 })}>{uploadError}</div>}
          </div>
        )}

        {/* Uploaded success */}
        {uploaded && (
          <div className={css({ marginTop: "16px" })}>
            <Notification kind="positive" overrides={{ Body: { style: { width: "100%" } } }}>
              ✅ Workbook processed successfully! Dashboard data has been refreshed.
            </Notification>

            <div className={css({ marginTop: "10px", display: "flex", gap: 8, justifyContent: "flex-end" })}>
              <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => { window.dispatchEvent(new Event("data:updated")); }}>
                Refresh dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Server error */}
        {uploadError && !uploading && (
          <div style={{ marginTop: 12 }}>
            <Notification kind="negative" overrides={{ Body: { style: { width: "100%" } } }}>
              ⚠️ {uploadError}
            </Notification>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ModalButton kind={KIND.tertiary} onClick={handleClose}>Cancel</ModalButton>

        <ModalButton
          onClick={handleUpload}
          disabled={!file || uploading || uploaded}
          overrides={{
            BaseButton: {
              style: {
                backgroundColor: !file || uploading || uploaded ? "#E8E8E8" : "#000",
                color: !file || uploading || uploaded ? "#999" : "#FFF",
              },
            },
          }}
        >
          {uploading ? "Processing..." : uploaded ? "Done" : "Upload & Process"}
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
}
