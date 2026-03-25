import { useStyletron } from "baseui";
import { useState, useRef } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";
import { Button, SIZE, KIND } from "baseui/button";
import { Notification } from "baseui/notification";
import { upload } from "@vercel/blob/client";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [css] = useStyletron();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const name = f?.name || "";
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

    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploaded(false);
    setUploadError(null);
    setProgress(0);

    try {
      const uploadedBlob = await upload(file.name, file, {
        access: "Public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (event) => {
          setProgress(Math.round(event.percentage));
        },
      });

      const analyzeResp = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pathname: uploadedBlob.pathname,
          fileName: file.name,
        }),
      });

      const analyzeJson = await analyzeResp.json();

      if (!analyzeResp.ok || !analyzeJson.success) {
        throw new Error(analyzeJson.error || "Analyze failed");
      }

      setUploaded(true);
      setProgress(100);

      window.dispatchEvent(
        new CustomEvent("data:updated", {
          detail: { version: analyzeJson.version },
        })
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
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
        <div
          className={css({
            fontSize: "13px",
            color: "#666",
            fontFamily: "UberMoveText",
            marginBottom: "12px",
          })}
        >
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

          <div
            className={css({
              fontFamily: "UberMoveText",
              fontWeight: 500,
              fontSize: "14px",
              color: "#333",
            })}
          >
            {file ? file.name : "Drag & drop your workbook here"}
          </div>

          <div
            className={css({
              fontFamily: "UberMoveText",
              fontSize: "12px",
              color: "#888",
              marginTop: "6px",
            })}
          >
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or click to browse · .xlsx, .xls, .csv"}
          </div>
        </div>

        {file && !uploaded && (
          <div
            className={css({
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#F8F9FA",
              borderRadius: "6px",
              border: "1px solid #E8E8E8",
            })}
          >
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <div>
                <div
                  className={css({
                    fontFamily: "UberMoveText",
                    fontWeight: 500,
                    fontSize: "13px",
                  })}
                >
                  {file.name}
                </div>

                <div
                  className={css({
                    fontFamily: "UberMoveText",
                    fontSize: "11px",
                    color: "#888",
                    marginTop: "2px",
                  })}
                >
                  Ready to process · {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>

              <Button
                size={SIZE.compact}
                kind={KIND.tertiary}
                onClick={() => {
                  setFile(null);
                  setUploadError(null);
                }}
              >
                ✕
              </Button>
            </div>

            {progress !== null && (
              <div className={css({ marginTop: 10 })}>
                <div
                  className={css({
                    height: 8,
                    background: "#eee",
                    borderRadius: 6,
                    overflow: "hidden",
                  })}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "#276EF1",
                    }}
                  />
                </div>

                <div className={css({ fontSize: 12, color: "#666", marginTop: 8 })}>
                  {progress}%
                </div>
              </div>
            )}

            {uploadError && (
              <div className={css({ color: "#E11900", marginTop: 8, fontSize: 13 })}>
                {uploadError}
              </div>
            )}
          </div>
        )}

        {uploaded && (
          <div className={css({ marginTop: "16px" })}>
            <Notification kind="positive" overrides={{ Body: { style: { width: "100%" } } }}>
              ✅ Workbook processed successfully! Dashboard data has been refreshed.
            </Notification>

            <div
              className={css({
                marginTop: "10px",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              })}
            >
              <Button
                size={SIZE.compact}
                kind={KIND.secondary}
                onClick={() => {
                  window.dispatchEvent(new Event("data:updated"));
                }}
              >
                Refresh dashboard
              </Button>
            </div>
          </div>
        )}

        {uploadError && !uploading && (
          <div style={{ marginTop: 12 }}>
            <Notification kind="negative" overrides={{ Body: { style: { width: "100%" } } }}>
              ⚠️ {uploadError}
            </Notification>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ModalButton kind={KIND.tertiary} onClick={handleClose}>
          Cancel
        </ModalButton>

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
