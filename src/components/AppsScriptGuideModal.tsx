import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldAlert, CheckCircle2, Code2, AlertTriangle, Play, Sparkles } from 'lucide-react';

interface AppsScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl?: string;
  spreadsheetId?: string;
}

export const APPS_SCRIPT_SOURCE_CODE = `/**
 * Google Apps Script for Google Sheet & Google Drive Sync Hub
 * 
 * Instructions:
 * 1. Open your Google Sheet -> Click Extensions -> Apps Script
 * 2. Paste this entire code into Code.gs
 * 3. Select 'authorizeDrive' function from top dropdown and click '▶ Run'
 * 4. Accept permissions: Review permissions -> Advanced -> Go to (unsafe) -> Allow
 * 5. Click 'Deploy' -> 'New deployment' (or Manage deployments -> Edit -> New version)
 *    - Type: Web app
 *    - Execute as: Me (your email)  <--- CRITICAL FOR DRIVE ACCESS!
 *    - Who has access: Anyone       <--- CRITICAL FOR WEB APP CALLS!
 * 6. Copy the Web App URL (/exec) into the app settings.
 */

// Function to trigger Google Drive & Sheets OAuth authorization in editor
function authorizeDrive() {
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Google Drive & Sheets permissions successfully authorized!");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var rawData = e.postData.contents;
    var request = JSON.parse(rawData);
    var action = request.action;
    var spreadsheetId = request.spreadsheetId;

    var ss = spreadsheetId 
      ? SpreadsheetApp.openById(spreadsheetId) 
      : SpreadsheetApp.getActiveSpreadsheet();

    // 1. UPLOAD FILE TO GOOGLE DRIVE
    if (action === "UPLOAD_FILE") {
      var folderPath = request.folderPath || request.folder || request.folderName || request.targetFolder || request.path || "Murad Rahman Saud";
      var fileName = request.fileName || request.filename || request.name || ("upload_" + new Date().getTime());
      var mimeType = request.mimeType || "application/octet-stream";
      var base64Data = request.base64Data;

      if (!base64Data) {
        return createJsonResponse({ success: false, error: "No base64 file data provided" });
      }

      // Find or create target folder hierarchy in Google Drive (supports subfolder paths like "Murad Rahman Saud/Profile Pictures")
      var targetFolder = getOrCreateDriveFolderByPath(folderPath);

      // Decode base64 and create file
      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      var file = targetFolder.createFile(blob);

      // Make file viewable by anyone with link so preview & thumbnails work
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (err) {
        Logger.log("Sharing error: " + err.message);
      }

      var fileId = file.getId();
      var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
      var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
      var downloadUrl = file.getDownloadUrl();

      return createJsonResponse({
        success: true,
        fileId: fileId,
        url: viewUrl,
        previewUrl: previewUrl,
        downloadUrl: downloadUrl,
        fileName: file.getName(),
        folderPath: folderPath,
        folderName: targetFolder.getName(),
        size: file.getSize()
      });
    }

    // 2. DELETE FILE FROM GOOGLE DRIVE
    if (action === "DELETE_FILE") {
      var deleteId = request.fileId;
      if (!deleteId) {
        return createJsonResponse({ success: false, error: "No fileId provided" });
      }
      var fileToDelete = DriveApp.getFileById(deleteId);
      fileToDelete.setTrashed(true);
      return createJsonResponse({ success: true, message: "File trashed successfully" });
    }

    // 3. GET TABS / SHEETS LIST
    if (action === "GET_TABS") {
      var allSheets = ss.getSheets();
      var tabs = allSheets.map(function(sheet, index) {
        return {
          id: "tab-" + sheet.getSheetId(),
          name: sheet.getName(),
          gid: String(sheet.getSheetId()),
          description: "Sheet " + (index + 1)
        };
      });
      return createJsonResponse({ success: true, tabs: tabs });
    }

    // For Sheet operations (ADD, UPDATE, DELETE), find sheet by GID or name
    var gid = request.gid ? String(request.gid).trim() : "0";
    var sheet = getSheetByGid(ss, gid);

    if (!sheet) {
      return createJsonResponse({ success: false, error: "Sheet tab with GID " + gid + " not found" });
    }

    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

    // Auto initialize headers if sheet is empty
    if (headers.length === 0 || (headers.length === 1 && String(headers[0]).trim() === "")) {
      var initialHeaders = Object.keys(request.data || {}).filter(function(k) { return String(k).trim() !== ""; });
      if (initialHeaders.length === 0) initialHeaders = ["Title", "Description"];
      sheet.appendRow(initialHeaders);
      headers = initialHeaders;
    }

    // 4. ADD NEW ROW
    if (action === "ADD") {
      var rowData = request.data || {};
      var newRow = [];

      for (var c = 0; c < headers.length; c++) {
        var header = headers[c];
        var val = "";
        if (header) {
          var hTrimmed = String(header).trim();
          val = rowData[header] !== undefined ? rowData[header] :
                rowData[hTrimmed] !== undefined ? rowData[hTrimmed] : "";
        }
        newRow.push(val);
      }

      sheet.appendRow(newRow);
      return createJsonResponse({ success: true, message: "Row added successfully" });
    }

    // 5. UPDATE EXISTING ROW
    if (action === "UPDATE") {
      var idKey = String(request.idKey || "").trim();
      var idVal = String(request.idValue || "").trim();
      var updateData = request.data || {};

      if (!idKey || !idVal) {
        return createJsonResponse({ success: false, error: "Missing idKey or idValue for UPDATE" });
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var keyColIndex = -1;

      for (var k = 0; k < headers.length; k++) {
        if (String(headers[k]).trim().toLowerCase() === idKey.toLowerCase()) {
          keyColIndex = k;
          break;
        }
      }

      if (keyColIndex === -1) {
        return createJsonResponse({ success: false, error: "ID Column '" + idKey + "' not found" });
      }

      var targetRowIndex = -1;
      for (var r = 1; r < values.length; r++) {
        if (String(values[r][keyColIndex]).trim() === idVal) {
          targetRowIndex = r + 1; // 1-indexed for Sheet range
          break;
        }
      }

      if (targetRowIndex === -1) {
        return createJsonResponse({ success: false, error: "Record with " + idKey + " = " + idVal + " not found" });
      }

      for (var col = 0; col < headers.length; col++) {
        var hName = headers[col];
        if (hName) {
          var hNameTrimmed = String(hName).trim();
          var newVal = updateData[hName] !== undefined ? updateData[hName] :
                       updateData[hNameTrimmed] !== undefined ? updateData[hNameTrimmed] : null;

          if (newVal !== null) {
            sheet.getRange(targetRowIndex, col + 1).setValue(newVal);
          }
        }
      }

      return createJsonResponse({ success: true, message: "Row updated successfully" });
    }

    // 6. DELETE ROW (And Automatically Delete Associated Drive Files)
    if (action === "DELETE") {
      var delKey = String(request.idKey || "").trim();
      var delVal = String(request.idValue || "").trim();
      var deleteFiles = request.deleteFiles !== false; // default to true
      var explicitFileIds = request.fileIds || [];

      var allVals = sheet.getDataRange().getValues();
      var colIdx = -1;

      for (var c2 = 0; c2 < headers.length; c2++) {
        if (String(headers[c2]).trim().toLowerCase() === delKey.toLowerCase()) {
          colIdx = c2;
          break;
        }
      }

      if (colIdx === -1) {
        return createJsonResponse({ success: false, error: "ID Column '" + delKey + "' not found" });
      }

      for (var r2 = 1; r2 < allVals.length; r2++) {
        if (String(allVals[r2][colIdx]).trim() === delVal) {
          var targetRowValues = allVals[r2];
          var deletedFilesCount = 0;

          // Detect and delete any Google Drive files linked in this row
          if (deleteFiles) {
            var driveFileIds = [];

            // Add any explicit file IDs passed from client
            if (Array.isArray(explicitFileIds)) {
              for (var f = 0; f < explicitFileIds.length; f++) {
                if (explicitFileIds[f]) driveFileIds.push(String(explicitFileIds[f]).trim());
              }
            }

            // Extract file IDs from all cells in the target row
            for (var cellIdx = 0; cellIdx < targetRowValues.length; cellIdx++) {
              var cellStr = String(targetRowValues[cellIdx] || "").trim();
              if (cellStr) {
                var extractedId = extractDriveIdFromText(cellStr);
                if (extractedId && driveFileIds.indexOf(extractedId) === -1) {
                  driveFileIds.push(extractedId);
                }
              }
            }

            // Trash/Delete each detected Google Drive file
            for (var d = 0; d < driveFileIds.length; d++) {
              try {
                var fileObj = DriveApp.getFileById(driveFileIds[d]);
                if (fileObj) {
                  fileObj.setTrashed(true);
                  deletedFilesCount++;
                }
              } catch (fileErr) {
                // Ignore if file already trashed or not found
              }
            }
          }

          sheet.deleteRow(r2 + 1);
          return createJsonResponse({
            success: true,
            message: "Row deleted successfully" + (deletedFilesCount > 0 ? " and " + deletedFilesCount + " connected Drive file(s) removed" : ""),
            deletedFilesCount: deletedFilesCount
          });
        }
      }

      return createJsonResponse({ success: false, error: "Record not found to delete" });
    }

    // 7. CREATE NEW SHEET TAB
    if (action === "CREATE_SHEET") {
      var sheetName = request.sheetName;
      if (!sheetName) {
        return createJsonResponse({ success: false, error: "Missing sheetName" });
      }
      try {
        var newSheet = ss.insertSheet(sheetName);
        // Initialize with default header columns so sheet data fetch works without errors
        newSheet.appendRow(["Title", "Description", "Status"]);
        return createJsonResponse({
          success: true,
          message: "Sheet created successfully",
          tab: {
            id: "tab-" + newSheet.getSheetId(),
            name: newSheet.getName(),
            gid: String(newSheet.getSheetId()),
            description: "Newly created sheet"
          }
        });
      } catch(e) {
        return createJsonResponse({ success: false, error: "Failed to create sheet: " + e.toString() });
      }
    }

    // 8. ADD NEW COLUMN
    if (action === "ADD_COLUMN") {
      var sheetGid = request.sheetGid;
      var columnName = request.columnName;
      if (!sheetGid || !columnName) {
        return createJsonResponse({ success: false, error: "Missing sheetGid or columnName" });
      }
      var targetSheet = getSheetByGid(ss, sheetGid);
      if (!targetSheet) {
        return createJsonResponse({ success: false, error: "Sheet not found" });
      }
      try {
        var lastCol = targetSheet.getLastColumn();
        if (lastCol === 0) {
          targetSheet.getRange(1, 1).setValue(columnName);
        } else {
          targetSheet.getRange(1, lastCol + 1).setValue(columnName);
        }
        return createJsonResponse({ success: true, message: "Column added successfully" });
      } catch (e) {
        return createJsonResponse({ success: false, error: "Failed to add column: " + e.toString() });
      }
    }

    // 9. DELETE SHEET TAB FROM GOOGLE SPREADSHEET
    if (action === "DELETE_SHEET") {
      var targetGid = request.sheetGid !== undefined ? String(request.sheetGid).trim() : (request.gid !== undefined ? String(request.gid).trim() : "");
      var targetName = request.sheetName || request.name;

      var sheetToDelete = null;
      if (targetGid) {
        sheetToDelete = getSheetByGid(ss, targetGid);
      }
      if (!sheetToDelete && targetName) {
        sheetToDelete = ss.getSheetByName(targetName);
      }

      if (!sheetToDelete) {
        return createJsonResponse({ success: false, error: "Sheet tab not found" });
      }

      try {
        if (ss.getSheets().length <= 1) {
          return createJsonResponse({ success: false, error: "Cannot delete the only remaining sheet in the Google Spreadsheet." });
        }
        var deletedTabName = sheetToDelete.getName();
        ss.deleteSheet(sheetToDelete);
        return createJsonResponse({
          success: true,
          message: "Sheet '" + deletedTabName + "' deleted from Google Sheet successfully"
        });
      } catch (e) {
        return createJsonResponse({ success: false, error: "Failed to delete sheet tab: " + e.toString() });
      }
    }

    return createJsonResponse({ success: false, error: "Invalid or unsupported action: " + action });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function extractDriveIdFromText(text) {
  if (!text || typeof text !== 'string') return '';
  var match = text.match(/\\/file\\/d\\/([a-zA-Z0-9_-]+)/) ||
              text.match(/\\/file\\/u\\/\\d+\\/d\\/([a-zA-Z0-9_-]+)/) ||
              text.match(/\\/d\\/([a-zA-Z0-9_-]+)/) ||
              text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (!text.includes('/') && !text.includes(' ') && text.length >= 25 && text.length <= 55) {
    return text;
  }
  return '';
}

function getSheetByGid(spreadsheet, targetGid) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()).trim() === String(targetGid).trim()) {
      return sheets[i];
    }
  }
  return sheets[0];
}

function getOrCreateDriveFolderByPath(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') {
    pathStr = "Murad Rahman Saud";
  }
  
  // Clean path parts e.g. "Murad Rahman Saud/Profile Pictures" -> ["Murad Rahman Saud", "Profile Pictures"]
  var parts = String(pathStr)
    .replace(/^[\\/\\\\]+|[\\/\\\\]+$/g, '')
    .split(/[\\/\\\\]+/)
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0; });

  if (parts.length === 0) {
    parts = ["Murad Rahman Saud"];
  }

  var currentFolder = null;

  for (var i = 0; i < parts.length; i++) {
    var folderName = parts[i];
    var iterator;

    if (currentFolder === null) {
      iterator = DriveApp.getFoldersByName(folderName);
    } else {
      iterator = currentFolder.getFoldersByName(folderName);
    }

    if (iterator.hasNext()) {
      currentFolder = iterator.next();
    } else {
      if (currentFolder === null) {
        currentFolder = DriveApp.createFolder(folderName);
      } else {
        currentFolder = currentFolder.createFolder(folderName);
      }
    }
  }

  return currentFolder || DriveApp.getRootFolder();
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const AppsScriptGuideModal: React.FC<AppsScriptGuideModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  spreadsheetId
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'fix' | 'code'>('fix');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center border border-amber-400">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Fix Google Drive Permission Error</h3>
              <p className="text-[11px] text-amber-100">Exception: Access denied: DriveApp Solution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-amber-200 hover:text-white hover:bg-amber-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('fix')}
            className={`px-3 py-1.5 font-semibold rounded-t-md transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'fix'
                ? 'border-amber-600 text-amber-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>3-Step Fix Instructions</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 font-semibold rounded-t-md transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Complete Apps Script Code (Code.gs)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'fix' ? (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  কেন <code>Access denied: DriveApp</code> এরর আসে?
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Google Apps Script এ ড্রাইভ আপলোডের অ্যাক্সেস পেতে হলে Web App টি অবশ্যই <strong>&quot;Execute as: Me&quot;</strong> হিসেবে ডেপ্লয় করতে হয় এবং Script Editor এ <code>authorizeDrive</code> রান করে পারমিশন গ্রহণ করতে হয়।
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  নিচের ৩টি ধাপ সম্পন্ন করুন (খুব সহজ):
                </h4>

                {/* Step 1 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">1</span>
                    <span>গুগল শিটের Script Editor ওপেন করে Authorize করুন</span>
                  </div>
                  <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
                    আপনার Google Sheet এ যান &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong> এ ক্লিক করুন।
                    উপরের ফাংশন মেনু থেকে <code className="bg-white px-1.5 py-0.5 rounded border text-teal-700 font-mono font-bold">authorizeDrive</code> সিলেক্ট করে <strong>▶ Run</strong> বাটনে ক্লিক করুন।
                  </p>
                  <div className="ml-7 p-2 bg-white rounded border border-slate-200 text-[11px] text-slate-600">
                    Google একটি পপআপ দেখাবে: <strong>Review permissions</strong> &gt; আপনার গুগল অ্যাকাউন্ট সিলেক্ট করুন &gt; <strong>Advanced</strong> &gt; <strong>Go to (unsafe)</strong> &gt; <strong>Allow</strong> এ ক্লিক করুন।
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px]">2</span>
                    <span>Deploy সেটিংসে &quot;Execute as: Me&quot; দিন (সবচেয়ে গুরুত্বপূর্ণ)</span>
                  </div>
                  <p className="text-amber-900 pl-7 text-[11px] leading-relaxed">
                    Apps Script এর উপরে ডানপাশে <strong>Deploy</strong> বাটনে ক্লিক করুন &gt; <strong>Manage deployments</strong> (অথবা New deployment) এ যান।
                  </p>
                  <div className="ml-7 p-2.5 bg-white rounded border border-amber-200 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">⚙️ Execute as:</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        Me (your-email@gmail.com)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">🌐 Who has access:</span>
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">
                        Anyone
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">📦 Version:</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-300">
                        New version
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px]">3</span>
                    <span>Deploy এ ক্লিক করুন</span>
                  </div>
                  <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
                    <strong>Deploy</strong> বাটনে ক্লিক করুন। যদি Web App URL পরিবর্তন হয় তবে অ্যাপের <strong>Settings</strong> এ পেস্ট করুন। এরপর Profile Picture বা Cover Photo তে ফাইল আপলোড দিলে তৎক্ষণাৎ ড্রাইভ লিংক ইনপুট ফিল্ডে চলে আসবে!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-semibold">
                  Google Apps Script (Code.gs) এর সম্পূর্ণ কোড:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Code!' : 'Copy Entire Code'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-[50vh] leading-relaxed select-all">
                {APPS_SCRIPT_SOURCE_CODE}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          {spreadsheetId ? (
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1"
            >
              <span>Open Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Script'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold transition shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
