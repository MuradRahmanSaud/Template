import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  ExternalLink,
  Plus,
  Trash2,
  Folder
} from 'lucide-react';
import { uploadFileToDrive, fileToBase64, formatDriveViewUrl } from '../services/sheetService';
import { AppsScriptGuideModal } from './AppsScriptGuideModal';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFolder: string;
  webAppUrl: string;
  onInsertToSheet?: (driveUrl: string, fileName: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  targetFolder,
  webAppUrl,
  onInsertToSheet,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>(targetFolder || 'Murad Rahman Saud');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDriveAuthError, setIsDriveAuthError] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setUploadedUrl(null);
    setUploadedFileId(null);
    setErrorMsg(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadedFileId(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);
      setIsDriveAuthError(false);
      const res = await uploadFileToDrive(selectedFile, currentFolder, webAppUrl);

      if (res.success && res.url) {
        const viewUrl = formatDriveViewUrl(res.url, res.fileId);
        setUploadedUrl(viewUrl);
        setUploadedFileId(res.fileId || null);
      } else {
        if (res.isAccessDenied || String(res.error).includes('DriveApp')) {
          setIsDriveAuthError(true);
        }
        throw new Error(res.error || 'Could not upload file to Google Drive');
      }
    } catch (err: any) {
      const errMsg = String(err.message || err);
      if (errMsg.includes('DriveApp') || errMsg.includes('Access denied')) {
        setIsDriveAuthError(true);
        setErrorMsg('Google Drive Access Denied: Apps Script must be deployed as "Execute as: Me" & authorized.');
      } else {
        setErrorMsg(errMsg);
      }
      setUploadedUrl(null);
      setUploadedFileId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = () => {
    if (!uploadedUrl) return;
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center border border-teal-500">
              <HardDrive className="w-4 h-4 text-teal-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Google Drive File & Photo Uploader</h3>
              <p className="text-[11px] text-teal-200">
                Target Folder: <span className="font-semibold text-white">{targetFolder}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Folder Selector with Quick Presets */}
          <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-teal-900 font-semibold">
              <label className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-teal-700" />
                <span>Google Drive Upload Destination:</span>
              </label>
            </div>
            <div className="relative">
              <Folder className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={currentFolder}
                onChange={(e) => setCurrentFolder(e.target.value)}
                placeholder="e.g. Murad Rahman Saud or Murad Rahman Saud/Profile Pictures"
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-teal-300 rounded text-xs text-teal-950 font-mono focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20"
              />
            </div>
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1 text-[10.5px] pt-0.5">
              <span className="font-medium text-slate-600">Quick Presets:</span>
              {[
                'Murad Rahman Saud',
                'Murad Rahman Saud/Profile Pictures',
                'Murad Rahman Saud/Cover Photos',
                'Murad Rahman Saud/Photos',
                'Murad Rahman Saud/Documents',
                'Murad Rahman Saud/Uploads'
              ].map((preset) => {
                const isSelected = currentFolder === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCurrentFolder(preset)}
                    className={`px-1.5 py-0.5 rounded font-mono transition border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-700 font-semibold shadow-2xs'
                        : 'bg-white hover:bg-teal-100 text-teal-800 border-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
                {isDriveAuthError && (
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold shrink-0"
                  >
                    🛠️ সমাধান দেখুন
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-300 hover:border-teal-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
            />

            {previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-36 max-w-full rounded-lg object-contain border border-slate-200 shadow-xs"
                />
                <span className="text-[11px] text-slate-500 block mt-1">Click or drag to replace photo</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Click to browse or drag & drop file/photo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Images, PDFs, Docs up to 25MB
                  </p>
                </div>
              </>
            )}

            {selectedFile && (
              <div className="mt-1 flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-medium max-w-xs">
                <span className="truncate">📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-0.5 hover:bg-rose-100 text-rose-600 rounded transition shrink-0"
                  title="Remove selected file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Success View */}
          {uploadedUrl && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-teal-800 font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Uploaded to Google Drive!</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="px-2 py-0.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1 transition shrink-0"
                  title="Remove file"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Remove</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-teal-200">
                <input
                  type="text"
                  readOnly
                  value={uploadedUrl}
                  className="flex-1 text-[11px] font-mono text-slate-700 bg-transparent focus:outline-none truncate"
                />
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded text-[11px] font-medium flex items-center gap-1 shrink-0 transition"
                  title="Open file preview in Google Drive"
                >
                  <ExternalLink className="w-3 h-3 text-teal-600" />
                  <span>Preview File</span>
                </a>
                <button
                  onClick={copyUrl}
                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shrink-0 transition"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {onInsertToSheet && (
                <button
                  onClick={() => {
                    onInsertToSheet(uploadedUrl, selectedFile?.name || 'File');
                    onClose();
                  }}
                  className="w-full mt-1 py-1.5 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Directly into Google Sheet Record</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 font-mono">
            {uploadedUrl ? 'Ready to attach' : 'Folder: ' + targetFolder}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium transition"
            >
              {uploadedUrl ? 'Done' : 'Cancel'}
            </button>

            {!uploadedUrl && (
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload to Drive</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <AppsScriptGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        webAppUrl={webAppUrl}
      />
    </div>
  );
};
