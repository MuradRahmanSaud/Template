import React, { useState, useMemo } from 'react';
import { AlertTriangle, Trash2, X, Loader2, FileText, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { extractDriveFileId } from '../services/sheetService';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: Record<string, any> | null;
  headers: string[];
  columnTypes?: Record<string, any>;
  onConfirm: (
    idKey: string,
    idValue: string | number,
    deleteDriveFiles: boolean,
    row: Record<string, any>
  ) => Promise<boolean>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  row,
  headers,
  columnTypes = {},
  onConfirm,
}) => {
  const [selectedIdKey, setSelectedIdKey] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteDriveFiles, setDeleteDriveFiles] = useState<boolean>(true);

  React.useEffect(() => {
    if (isOpen && headers.length > 0) {
      setErrorMsg(null);
      setIsDeleting(false);
      let pCol = headers.find((h) => {
        const rawConfig = columnTypes[h] || columnTypes[h.trim()];
        if (typeof rawConfig === 'object' && rawConfig.isPrimary) return true;
        return false;
      });
      if (!pCol) {
        pCol = headers.find((h) => /^id$/i.test(h.trim()) || /_id$/i.test(h.trim()) || /^sl$/i.test(h.trim())) || headers[0];
      }
      setSelectedIdKey(pCol || headers[0]);
    }
  }, [isOpen, headers, columnTypes]);

  // Extract all Google Drive files and attachments in this row
  const detectedDriveFiles = useMemo(() => {
    if (!row) return [];
    const files: { column: string; value: string; fileId: string }[] = [];
    Object.entries(row).forEach(([col, val]) => {
      if (val === null || val === undefined) return;
      const str = String(val).trim();
      if (!str) return;
      const fileId = extractDriveFileId(str);
      if (fileId) {
        files.push({
          column: col,
          value: str,
          fileId,
        });
      }
    });
    return files;
  }, [row]);

  if (!isOpen || !row) return null;

  const idValue = row[selectedIdKey];

  const handleDelete = () => {
    try {
      setErrorMsg(null);
      onConfirm(selectedIdKey, idValue, deleteDriveFiles, row);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete row');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center border border-rose-500">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Delete Record & Drive Files</h3>
              <p className="text-[11px] text-rose-100">Permanently delete row and connected Drive files</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-rose-200 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800">
              {errorMsg}
            </div>
          )}

          <p className="text-slate-600">
            Are you sure you want to delete this record from Google Sheet?
          </p>
          {/* Key Selection Indicator */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Matching Column:</span>
              <span className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700">
                {selectedIdKey}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Target Value: <strong className="text-slate-800 font-mono">{String(idValue ?? 'N/A')}</strong>
            </div>
          </div>

          {/* Detected Google Drive Files Alert */}
          {detectedDriveFiles.length > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <strong className="font-semibold text-amber-950 block">
                      Google Drive File{detectedDriveFiles.length > 1 ? 's' : ''} Attached ({detectedDriveFiles.length})
                    </strong>
                    <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                      Auto-Trash
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Deleting this record will also remove its associated file(s) from your Google Drive folder.
                  </p>
                </div>
              </div>

              {/* Detected Drive Links list */}
              <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
                {detectedDriveFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-1.5 px-2 py-1 bg-amber-100/60 rounded text-[11px] font-mono text-amber-900 border border-amber-200/60"
                  >
                    <span className="font-bold text-amber-950 truncate max-w-[100px]">{f.column}:</span>
                    <span className="truncate text-amber-800 text-[10px] flex-1">{f.fileId}</span>
                    <span className="text-[10px] text-rose-700 font-sans font-medium flex-shrink-0">Will be deleted</span>
                  </div>
                ))}
              </div>

              {/* Toggle switch for Drive file deletion */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteDriveFiles}
                  onChange={(e) => setDeleteDriveFiles(e.target.checked)}
                  className="rounded border-amber-400 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-amber-950">
                  Also delete file(s) from Google Drive (Recommended)
                </span>
              </label>
            </div>
          )}

          {/* Row Preview Snippet */}
          <div className="max-h-28 overflow-y-auto p-2 bg-slate-100 rounded border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
            {Object.entries(row).slice(0, 6).map(([k, v]) => (
              <div key={k} className="truncate">
                <span className="text-slate-400">{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Record & Files...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Confirm Delete {detectedDriveFiles.length > 0 && deleteDriveFiles ? '(+ Drive Files)' : ''}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

