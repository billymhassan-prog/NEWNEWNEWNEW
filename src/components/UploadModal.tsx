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
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')) {
      setFile(f);
      setUploaded(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploaded(true);
    }, 2000);
  };

  const handleClose = () => {
    setFile(null);
    setUploaded(false);
    setUploading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} overrides={{
      Dialog: { style: { width: '560px', borderRadius: '12px' } },
    }}>
      <ModalHeader>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>Upload Data</div>
      </ModalHeader>
      <ModalBody>
        <div className={css({ fontSize: '13px', color: '#666', fontFamily: 'UberMoveText', marginBottom: '16px' })}>
          Upload your team productivity workbook (.xlsx, .xls, or .csv) to refresh the dashboard.
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={css({
            border: `2px dashed ${dragOver ? '#276EF1' : '#D0D0D0'}`,
            borderRadius: '8px', padding: '40px 20px', textAlign: 'center' as const,
            cursor: 'pointer', backgroundColor: dragOver ? '#F0F5FF' : '#FAFAFA',
            transition: 'all 0.15s', ':hover': { borderColor: '#276EF1', backgroundColor: '#F8FAFF' },
          })}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            className={css({ display: 'none' })} />
          <div className={css({ fontSize: '32px', marginBottom: '8px' })}>📊</div>
          <div className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '14px', color: '#333' })}>
            {file ? file.name : 'Drag & drop your workbook here'}
          </div>
          <div className={css({ fontFamily: 'UberMoveText', fontSize: '12px', color: '#888', marginTop: '4px' })}>
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'or click to browse · .xlsx, .xls, .csv'}
          </div>
        </div>

        {file && !uploaded && (
          <div className={css({ marginTop: '16px', padding: '12px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #E8E8E8' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
              <div>
                <div className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '13px' })}>{file.name}</div>
                <div className={css({ fontFamily: 'UberMoveText', fontSize: '11px', color: '#888', marginTop: '2px' })}>
                  Ready to process · {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => setFile(null)}>✕</Button>
            </div>
          </div>
        )}

        {uploading && (
          <div className={css({ marginTop: '16px' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
              <div className={css({
                width: '16px', height: '16px', border: '2px solid #276EF1', borderTopColor: 'transparent',
                borderRadius: '50%', animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } as any,
                animationDuration: '0.8s', animationIterationCount: 'infinite', animationTimingFunction: 'linear',
              })} />
              <span className={css({ fontFamily: 'UberMoveText', fontSize: '13px', color: '#276EF1' })}>Processing workbook...</span>
            </div>
          </div>
        )}

        {uploaded && (
          <div className={css({ marginTop: '16px' })}>
            <Notification kind="positive" overrides={{ Body: { style: { width: '100%' } } }}>
              ✅ Workbook processed successfully! Dashboard data has been refreshed.
            </Notification>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <ModalButton kind={KIND.tertiary} onClick={handleClose}>Cancel</ModalButton>
        <ModalButton
          onClick={handleUpload}
          disabled={!file || uploading || uploaded}
          overrides={{ BaseButton: { style: { backgroundColor: !file || uploading || uploaded ? '#E8E8E8' : '#000', color: !file || uploading || uploaded ? '#999' : '#FFF' } } }}
        >
          {uploading ? 'Processing...' : uploaded ? 'Done' : 'Upload & Process'}
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
}