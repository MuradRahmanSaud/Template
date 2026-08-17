import React, { useState } from 'react';
import { X, ExternalLink, Download, Image as ImageIcon, Copy, Check, Eye } from 'lucide-react';
import { extractDriveFileId, getDriveThumbnailUrl } from '../services/sheetService';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  url,
  title = 'File Preview',
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !url) return null;

  const fileId = extractDriveFileId(url);
  const isDriveUrl = Boolean(fileId) || url.includes('drive.google.com');
  const previewThumbnail = isDriveUrl ? getDriveThumbnailUrl(url) : url;
  const embedPreviewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <h3 className="text-xs font-semibold truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
              title="Open full page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image / View Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[320px] max-h-[65vh]">
          {!imgError ? (
            <img
              src={previewThumbnail}
              alt={title}
              className="max-h-[60vh] max-w-full rounded-lg shadow-sm object-contain bg-white"
              onError={() => setImgError(true)}
            />
          ) : isDriveUrl ? (
            <iframe
              src={embedPreviewUrl}
              title={title}
              className="w-full h-[55vh] rounded border border-slate-200 bg-white"
              allow="autoplay"
            />
          ) : (
            <div className="text-center p-6 text-xs text-slate-600 space-y-3">
              <p className="font-semibold text-slate-800 text-sm">Preview not directly embeddable</p>
              <p className="text-slate-500 font-mono max-w-md truncate">{url}</p>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-medium text-xs shadow-xs transition"
              >
                <span>Open File in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-md" title={url}>
            {url}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium transition flex items-center gap-1 shadow-2xs"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
