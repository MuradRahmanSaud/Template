import Papa from 'papaparse';
import { SheetOperationResponse, SheetTab, UploadResponse, ColumnTypeMap, ColumnConfig, DATA_TYPE_GID } from '../types';

export const DEFAULT_SPREADSHEET_ID =
  (import.meta.env.VITE_DEFAULT_SPREADSHEET_ID as string) ||
  (import.meta.env.VITE_SPREADSHEET_ID as string) ||
  "1rgu0ecVE4ClteQnbARFhQrPoorqlBrbtgMbv335r3aE";

export const DEFAULT_WEB_APP_URL =
  (import.meta.env.VITE_DEFAULT_WEB_APP_URL as string) ||
  (import.meta.env.VITE_WEB_APP_URL as string) ||
  "https://script.google.com/macros/s/AKfycbx7pZyoo61kvJe1vl_1W6lbtUGwGi-WplElEkOcv8V9Meiu9H6xh37nORzRd37MeZAA/exec";

export const DEFAULT_FOLDER_PATH =
  (import.meta.env.VITE_DEFAULT_FOLDER_PATH as string) ||
  (import.meta.env.VITE_FOLDER_PATH as string) ||
  "Murad Rahman Saud";

export async function fetchServerDefaultConfig(): Promise<{ spreadsheetId: string; webAppUrl: string; folderPath: string } | null> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Could not fetch server default config:", err);
  }
  return null;
}

export const INITIAL_TABS: SheetTab[] = [
  {
    id: 'tab-0',
    name: 'Settings',
    gid: '0',
    description: 'Settings Sheet',
  },
];

/**
 * Dynamically fetches all sheet tabs with their real names and GIDs from Google Sheets.
 */
export async function fetchSheetTabs(spreadsheetId: string = DEFAULT_SPREADSHEET_ID): Promise<SheetTab[]> {
  try {
    const url = `/api/sheet-tabs?spreadsheetId=${encodeURIComponent(spreadsheetId)}&_t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) {
      return INITIAL_TABS;
    }
    
    // Check if the response is actually JSON to prevent SyntaxError on HTML (e.g. transient 502/loading pages)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("Expected JSON but received:", contentType);
      return INITIAL_TABS;
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.tabs) && data.tabs.length > 0) {
      return data.tabs;
    }
    return INITIAL_TABS;
  } catch (error) {
    console.error("Failed to fetch sheet tabs:", error);
    return INITIAL_TABS;
  }
}

/**
 * Creates a new sheet tab in the Google Spreadsheet.
 */
export async function createSheetTab(
  spreadsheetId: string,
  sheetName: string,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<{ success: boolean; tab?: SheetTab; error?: string }> {
  try {
    const res = await callAppsScript(
      {
        action: 'CREATE_SHEET',
        spreadsheetId,
        sheetName,
      },
      webAppUrl
    );
    if (res.success && res.tab) {
      return { success: true, tab: res.tab };
    }
    return { success: false, error: res.error || "Failed to create sheet" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Adds a new column to the specified sheet.
 */
export async function addSheetColumn(
  spreadsheetId: string,
  sheetGid: string,
  columnName: string,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await callAppsScript(
      {
        action: 'ADD_COLUMN',
        spreadsheetId,
        sheetGid,
        columnName,
      },
      webAppUrl
    );
    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to add column" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches Google Sheet CSV data via the server proxy, with client-side fallback and parses headers and rows.
 */
export async function fetchSheetData(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  gid: string = '0'
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  let csvText = '';
  const url = `/api/sheet-data?spreadsheetId=${encodeURIComponent(spreadsheetId)}&gid=${encodeURIComponent(gid)}&_t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      csvText = await response.text();
    } else {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Server proxy returned status ${response.status}`);
    }
  } catch (serverError) {
    console.warn("Server sheet proxy failed, attempting direct browser fetch from Google Sheets...", serverError);
    // Direct client-side fetch fallbacks
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
    const directRes = await fetch(gvizUrl);
    
    if (directRes.ok) {
      csvText = await directRes.text();
    } else {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;
      const exportRes = await fetch(exportUrl);
      if (exportRes.ok) {
        csvText = await exportRes.text();
      } else {
        throw new Error(`Failed to fetch sheet data (Status: ${exportRes.status}). Please verify that Google Sheet sharing is set to "Anyone with the link can view".`);
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = (results.meta.fields || []).filter(h => h && h.length > 0);
        // Clean rows
        const rows = (results.data as Record<string, any>[]).filter((row) => {
          // Filter out rows that are completely empty
          return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
        });
        resolve({ headers, rows });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Calls Google Apps Script Web App through backend proxy.
 */
async function callAppsScript(payload: any, webAppUrl: string = DEFAULT_WEB_APP_URL): Promise<any> {
  const response = await fetch('/api/appscript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-web-app-url': webAppUrl,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apps Script Error (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Normalizes payload data by mapping keys with trailing/leading spaces.
 * This guarantees that Google Sheet column headers with trailing or leading spaces (e.g. "Designation ")
 * receive their corresponding values even when the front-end headers are trimmed.
 */
export function normalizePayloadData(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      normalized[key] = value;
      const trimmed = key.trim();
      normalized[trimmed] = value;
      normalized[trimmed + ' '] = value;
      normalized[trimmed + '  '] = value;
      normalized[' ' + trimmed] = value;

      // Add casing variations to ensure Google Sheet headers match regardless of case
      const lower = trimmed.toLowerCase();
      normalized[lower] = value;
      normalized[lower + ' '] = value;

      const upper = trimmed.toUpperCase();
      normalized[upper] = value;
      normalized[upper + ' '] = value;

      // Capitalized first letter
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      normalized[capitalized] = value;
      normalized[capitalized + ' '] = value;
    }
  }

  return normalized;
}

/**
 * Adds a new row to the specified sheet.
 */
export async function addRowToSheet(
  spreadsheetId: string,
  gid: string,
  data: Record<string, any>,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<SheetOperationResponse> {
  return callAppsScript(
    {
      action: 'ADD',
      spreadsheetId,
      gid,
      data: normalizePayloadData(data),
    },
    webAppUrl
  );
}

/**
 * Updates an existing row in the sheet matching idKey and idValue.
 */
export async function updateRowInSheet(
  spreadsheetId: string,
  gid: string,
  idKey: string,
  idValue: string | number,
  data: Record<string, any>,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<SheetOperationResponse> {
  return callAppsScript(
    {
      action: 'UPDATE',
      spreadsheetId,
      gid,
      idKey,
      idValue,
      data: normalizePayloadData(data),
    },
    webAppUrl
  );
}

/**
 * Deletes a row in the sheet matching idKey and idValue.
 * Also automatically cleans up/deletes any associated files stored in Google Drive.
 */
export async function deleteRowFromSheet(
  spreadsheetId: string,
  gid: string,
  idKey: string,
  idValue: string | number,
  webAppUrl: string = DEFAULT_WEB_APP_URL,
  options?: {
    row?: Record<string, any>;
    fileIds?: string[];
    deleteAssociatedFiles?: boolean;
  }
): Promise<SheetOperationResponse> {
  const deleteFiles = options?.deleteAssociatedFiles !== false;
  const fileIds = options?.fileIds || (options?.row ? extractAllDriveFileIdsFromRow(options.row) : []);

  const res = await callAppsScript(
    {
      action: 'DELETE',
      spreadsheetId,
      gid,
      idKey,
      idValue,
      deleteFiles,
      fileIds,
      rowData: options?.row || {},
    },
    webAppUrl
  );

  // Client-side fallback: if file IDs are identified and backend hasn't reported them deleted, ensure cleanup
  if (deleteFiles && fileIds.length > 0 && res.success) {
    for (const fId of fileIds) {
      try {
        await deleteFileFromDrive(fId, webAppUrl);
      } catch (err) {
        console.warn('Fallback delete for Drive file:', fId, err);
      }
    }
  }

  return res;
}

/**
 * Helper to convert browser File to base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove the Data URL prefix (e.g. 'data:image/jpeg;base64,')
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Extracts Google Drive File ID from URL or ID string.
 */
export function extractDriveFileId(urlOrId: string): string {
  if (!urlOrId) return '';
  const raw = String(urlOrId).trim();
  if (!raw.includes('/') && !raw.includes('?') && !raw.includes('&') && raw.length >= 10 && raw.length <= 60) {
    return raw;
  }
  const match = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                raw.match(/\/file\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/) ||
                raw.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
}

/**
 * Extracts all Google Drive File IDs found in any column/cell of a given record.
 */
export function extractAllDriveFileIdsFromRow(row: Record<string, any>): string[] {
  if (!row || typeof row !== 'object') return [];
  const ids = new Set<string>();

  Object.entries(row).forEach(([_, val]) => {
    if (val === null || val === undefined) return;
    const str = String(val).trim();
    if (!str) return;

    const fileId = extractDriveFileId(str);
    if (fileId && fileId.length >= 10) {
      ids.add(fileId);
    }
  });

  return Array.from(ids);
}

/**
 * Formats any Google Drive URL or File ID into standard view link: https://drive.google.com/file/d/{FILE_ID}/view
 */
export function formatDriveViewUrl(url: string, fileId?: string): string {
  const cleanId = (fileId || '').trim();
  if (cleanId && cleanId.length > 5 && !cleanId.startsWith('http')) {
    return `https://drive.google.com/file/d/${cleanId}/view`;
  }
  if (!url) return '';
  const rawUrl = url.trim();

  const extracted = extractDriveFileId(rawUrl);
  if (extracted) {
    return `https://drive.google.com/file/d/${extracted}/view`;
  }

  return rawUrl;
}

/**
 * Returns direct image preview / thumbnail URL for a Drive link or URL.
 */
export function getDriveThumbnailUrl(url: string): string {
  if (!url) return '';
  const id = extractDriveFileId(url);
  if (id) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  }
  return url;
}

/**
 * Uploads a file to Google Drive via Google Apps Script (action: "UPLOAD_FILE").
 * Converts file to Base64 in memory solely for transmission, awaits API response,
 * and formats the returned Drive File ID/Link to https://drive.google.com/file/d/{FILE_ID}/view
 */
export async function uploadFileToDrive(
  file: File,
  folderPath: string = DEFAULT_FOLDER_PATH,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<UploadResponse> {
  try {
    // 1. Read file to Base64 only in memory for payload transmission
    const base64Data = await fileToBase64(file);
    const cleanFolderPath = (folderPath || DEFAULT_FOLDER_PATH).trim();
    
    const payload = {
      action: 'UPLOAD_FILE',
      folderPath: cleanFolderPath,
      folder: cleanFolderPath,
      folderName: cleanFolderPath,
      targetFolder: cleanFolderPath,
      path: cleanFolderPath,
      filename: file.name,
      fileName: file.name,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
    };

    // 2. Wait for Google Apps Script Web App POST response
    const res = await callAppsScript(payload, webAppUrl);

    // Extract all potential fileId & url fields from various Apps Script response formats
    const fileId = 
      res.fileId || 
      res.id || 
      res.file_id || 
      res.data?.fileId || 
      res.data?.id || 
      res.data?.file_id || 
      '';

    const rawUrl = 
      res.url || 
      res.previewUrl || 
      res.viewUrl || 
      res.fileUrl || 
      res.webViewLink || 
      res.fileLink || 
      res.downloadUrl || 
      res.link || 
      res.directUrl || 
      res.previewLink || 
      res.thumbnailLink || 
      res.data?.url || 
      res.data?.previewUrl || 
      res.data?.viewUrl || 
      res.data?.fileUrl || 
      res.data?.webViewLink || 
      '';

    // Determine upload success
    const isSuccess = 
      res.success === true || 
      res.success === 'true' || 
      res.status === 'success' || 
      res.status === 'ok' || 
      res.result === 'success' || 
      (Boolean(fileId || rawUrl) && !res.error);

    // 3. If upload succeeded, return formatted drive view URL
    if (isSuccess && (fileId || rawUrl)) {
      const viewUrl = formatDriveViewUrl(rawUrl, fileId);
      const finalId = fileId || extractDriveFileId(viewUrl) || extractDriveFileId(rawUrl);
      return {
        success: true,
        fileId: finalId,
        url: viewUrl,
      };
    }

    const errorMsg = res.error || res.message || 'Failed to upload file to Google Drive';
    return {
      success: false,
      fileId: '',
      url: '',
      error: errorMsg,
      isAccessDenied: String(errorMsg).includes('DriveApp') || String(errorMsg).includes('Access denied'),
    };
  } catch (err: any) {
    const errorMsg = String(err?.message || err);
    return {
      success: false,
      fileId: '',
      url: '',
      error: errorMsg,
      isAccessDenied: errorMsg.includes('DriveApp') || errorMsg.includes('Access denied'),
    };
  }
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFileFromDrive(
  fileId: string,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<{ success: boolean; error?: string }> {
  return callAppsScript(
    {
      action: 'DELETE_FILE',
      fileId,
    },
    webAppUrl
  );
}

/**
 * Normalizes a raw column config (which can be a legacy string like "text", "file:Folder", "select:A,B"
 * or a ColumnConfig object) into a consistent ColumnConfig object.
 */
export function normalizeColumnConfig(raw: string | ColumnConfig | undefined): ColumnConfig {
  if (!raw) {
    return {
      type: 'text',
      options: '',
      folderPath: 'Murad Rahman Saud',
      showInTable: true,
      showInForm: true,
      order: undefined,
    };
  }

  if (typeof raw === 'object') {
    return {
      type: raw.type || 'text',
      options: raw.options || '',
      folderPath: raw.folderPath || 'Murad Rahman Saud',
      showInTable: raw.showInTable !== false,
      showInForm: raw.showInForm !== false,
      order: typeof raw.order === 'number' ? raw.order : undefined,
      selectMode: raw.selectMode || 'single',
    };
  }

  const str = String(raw).trim();
  if (str.startsWith('select:')) {
    return {
      type: 'select',
      options: str.substring(7).trim(),
      folderPath: 'Murad Rahman Saud',
      showInTable: true,
      showInForm: true,
      order: undefined,
    };
  }
  if (str.startsWith('file:')) {
    return {
      type: 'file',
      options: '',
      folderPath: str.substring(5).trim() || 'Murad Rahman Saud',
      showInTable: true,
      showInForm: true,
      order: undefined,
    };
  }
  if (str === 'file') {
    return {
      type: 'file',
      options: '',
      folderPath: 'Murad Rahman Saud',
      showInTable: true,
      showInForm: true,
      order: undefined,
    };
  }

  return {
    type: str || 'text',
    options: '',
    folderPath: 'Murad Rahman Saud',
    showInTable: true,
    showInForm: true,
    order: undefined,
  };
}

/**
 * Sorts column headers based on custom sequence/order configured in columnConfigs.
 * Columns with an explicit `order` index appear first in ascending order, followed
 * by any remaining unconfigured headers in their original order.
 */
export function getOrderedHeaders(
  headers: string[],
  configs?: Record<string, string | ColumnConfig>
): string[] {
  if (!headers || headers.length <= 1) return [...(headers || [])];
  if (!configs || Object.keys(configs).length === 0) {
    return [...headers];
  }

  const headerList = [...headers];

  return headerList.sort((a, b) => {
    const cfgA = configs[a] ?? configs[a.trim()];
    const cfgB = configs[b] ?? configs[b.trim()];

    const normA = normalizeColumnConfig(cfgA);
    const normB = normalizeColumnConfig(cfgB);

    const orderA = typeof normA.order === 'number' ? normA.order : 99999;
    const orderB = typeof normB.order === 'number' ? normB.order : 99999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return headers.indexOf(a) - headers.indexOf(b);
  });
}

/**
 * Checks whether a column should be visible in the Data Table.
 */
export function isColumnVisibleInTable(
  colName: string,
  configs?: Record<string, string | ColumnConfig>
): boolean {
  if (!configs) return true;
  const cfg = configs[colName] ?? configs[colName.trim()];
  if (!cfg) return true;
  const normalized = normalizeColumnConfig(cfg);
  return normalized.showInTable !== false;
}

/**
 * Checks whether a column should be visible in the Record Modal (Add/Edit form).
 */
export function isColumnVisibleInForm(
  colName: string,
  configs?: Record<string, string | ColumnConfig>
): boolean {
  if (!configs) return true;
  const cfg = configs[colName] ?? configs[colName.trim()];
  if (!cfg) return true;
  const normalized = normalizeColumnConfig(cfg);
  return normalized.showInForm !== false;
}

/**
 * Extracts the input type string (e.g. 'file:Folder', 'select:A,B', 'text', 'date')
 * for a column.
 */
export function getColumnInputType(raw: string | ColumnConfig | undefined): string {
  if (!raw) return 'text';
  if (typeof raw === 'string') return raw;
  if (raw.type === 'select' && raw.options) {
    return `select:${raw.options}`;
  }
  if (raw.type === 'file' && raw.folderPath) {
    return `file:${raw.folderPath}`;
  }
  return raw.type || 'text';
}

/**
 * Fetches column type mapping from "Settings" sheet (GID: 0).
 * Returns map: { [gid: string]: { [columnName: string]: string | ColumnConfig } }
 */
export async function fetchDataTypeConfigs(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<ColumnTypeMap> {
  try {
    const { rows } = await fetchSheetData(spreadsheetId, '0');
    const result: ColumnTypeMap = {};

    // 1. Process legacy single row if present (e.g. Title: "Configure Column Input Types")
    const legacyRow = rows.find((r) => {
      const title = (r['title'] || r['Title'] || '').trim().toLowerCase();
      return title === 'configure column input types';
    });

    if (legacyRow) {
      const dataStr = legacyRow['description'] || legacyRow['Description'] || '{}';
      try {
        const parsed = JSON.parse(dataStr);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              result[k] = v as Record<string, string | ColumnConfig>;
            }
          });
        }
      } catch (e) {
        console.warn("Could not parse legacy column config row:", e);
      }
    }

    // 2. Scan all rows for per-sheet / per-GID individual configuration rows
    for (const row of rows) {
      const titleKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'title') || 'title';
      const descKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'description') || 'description';
      const title = String(row[titleKey] || '').trim();
      const desc = String(row[descKey] || '').trim();

      if (!title || !desc) continue;

      // Skip the exact legacy row because it was handled above
      if (title.toLowerCase() === 'configure column input types') continue;

      // Match rows with titles like "Configure Column Input Types - Employees (GID: 123456)",
      // "Column Input Types - Tab1 (GID: 0)", etc.
      const isColConfigRow = /configure\s*column\s*(input\s*)?types/i.test(title) ||
                            /column\s*(input\s*)?types/i.test(title);

      if (isColConfigRow) {
        try {
          const parsed = JSON.parse(desc);
          if (typeof parsed === 'object' && parsed !== null) {
            let targetGid: string | null = null;

            // Extract from JSON payload if available
            if (parsed._gid !== undefined && parsed._gid !== null) {
              targetGid = String(parsed._gid).trim();
            } else if (parsed.gid !== undefined && parsed.gid !== null) {
              targetGid = String(parsed.gid).trim();
            }

            // Extract from title format like "(GID: 123456)" or "GID: 123456" or "GID 123456"
            if (!targetGid) {
              const gidMatch = title.match(/GID[:\s]*([0-9a-zA-Z_-]+)/i);
              if (gidMatch) {
                targetGid = gidMatch[1].trim();
              }
            }

            // Extract column map (handle if wrapped in .columns or direct object)
            const colMap = (parsed.columns && typeof parsed.columns === 'object') ? parsed.columns : parsed;

            if (targetGid) {
              result[targetGid] = colMap;
            }
          }
        } catch (e) {
          console.warn("Could not parse per-sheet column config row:", title, e);
        }
      }
    }

    return result;
  } catch (err) {
    console.warn("Could not fetch data type configs from Settings sheet:", err);
    return {};
  }
}

/**
 * Saves or updates column input types for a specific sheet tab to "Settings" sheet (GID: 0).
 */
export async function saveColumnTypesToSheet(
  spreadsheetId: string,
  gid: string,
  sheetName: string,
  columnTypes: Record<string, string | ColumnConfig>,
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<SheetOperationResponse> {
  try {
    let existingRows: Record<string, any>[] = [];
    let headers: string[] = [];
    try {
      const data = await fetchSheetData(spreadsheetId, '0');
      existingRows = data.rows;
      headers = data.headers;
    } catch {}

    // Find the exact header names matching 'title' and 'description' to prevent case mismatch
    const titleKey = headers.find(h => h.trim().toLowerCase() === 'title') || 'Title';
    const descKey = headers.find(h => h.trim().toLowerCase() === 'description') || 'Description';

    const expectedTitle = `Configure Column Input Types - ${sheetName} (GID: ${gid})`;

    // Locate existing individual row for this specific GID or Sheet Name
    const existingRow = existingRows.find((r) => {
      return Object.entries(r).some(([key, val]) => {
        const cleanKey = key.trim().toLowerCase();
        const cleanVal = String(val || '').trim();
        if (cleanKey !== titleKey.toLowerCase() && !/title|key|name/i.test(cleanKey)) return false;

        // Exact match with expected title
        if (cleanVal.toLowerCase() === expectedTitle.toLowerCase()) return true;

        // Match if row starts with Configure Column Input Types and contains GID: {gid}
        if (/configure\s*column\s*(input\s*)?types/i.test(cleanVal) || /column\s*(input\s*)?types/i.test(cleanVal)) {
          const gidMatch = new RegExp(`GID[:\\s]*${gid}\\b`, 'i').test(cleanVal);
          if (gidMatch) return true;

          // Or match by sheet name if there's no conflicting GID
          const sheetMatch = new RegExp(`\\b${sheetName}\\b`, 'i').test(cleanVal);
          if (sheetMatch && !/GID[:\\s]*[0-9]+/i.test(cleanVal)) return true;
        }

        return false;
      });
    });
    
    const rowData = {
      [titleKey]: expectedTitle,
      [descKey]: JSON.stringify(columnTypes)
    };

    if (existingRow) {
      const titleCellKey = Object.keys(existingRow).find(k => k.trim().toLowerCase() === titleKey.toLowerCase()) || titleKey;
      const currentTitleVal = existingRow[titleCellKey] || expectedTitle;

      await updateRowInSheet(
        spreadsheetId,
        '0',
        titleCellKey,
        currentTitleVal,
        rowData,
        webAppUrl
      );
    } else {
      await addRowToSheet(
        spreadsheetId,
        '0',
        rowData,
        webAppUrl
      );
    }

    return { 
      success: true, 
      message: `Successfully saved column configuration for '${sheetName}' (GID: ${gid}) to row '${expectedTitle}' in Settings sheet` 
    };
  } catch (error: any) {
    console.error("Failed to save column input types to Settings sheet:", error);
    return { success: false, error: error.message || "Failed to save column input types" };
  }
}

/**
 * Saves or updates application configuration (Spreadsheet ID, Apps Script Web App URL, Folder Path)
 * to Google Sheet (GID: 0).
 */
export async function saveAppConfigToSheet(
  config: { spreadsheetId: string; webAppUrl: string; folderPath: string },
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<SheetOperationResponse> {
  try {
    const targetSpreadsheetId = config.spreadsheetId.trim() || DEFAULT_SPREADSHEET_ID;
    const targetWebAppUrl = (config.webAppUrl.trim() || webAppUrl || DEFAULT_WEB_APP_URL);

    let existingRows: Record<string, any>[] = [];
    let headers: string[] = [];
    try {
      const data = await fetchSheetData(targetSpreadsheetId, '0');
      existingRows = data.rows;
      headers = data.headers;
    } catch {}

    const titleKey = headers.find(h => /^(title|key|name|setting|field)/i.test(h.trim())) || 'Title';
    const descKey = headers.find(h => /^(description|value|val|data|content)/i.test(h.trim())) || 'Description';

    const itemsToSave = [
      {
        title: 'Google Spreadsheet ID',
        matchRegex: /spreadsheet\s*id/i,
        value: config.spreadsheetId.trim(),
      },
      {
        title: 'Google Apps Script Web App URL',
        matchRegex: /apps\s*script|web\s*app\s*url/i,
        value: config.webAppUrl.trim(),
      },
      {
        title: 'Google Drive Target Folder Name / Path',
        matchRegex: /target\s*folder|drive.*folder|folder\s*path/i,
        value: config.folderPath.trim(),
      },
    ];

    for (const item of itemsToSave) {
      const existingRow = existingRows.find((r) => {
        return Object.entries(r).some(([key, val]) => {
          const cleanKey = key.trim().toLowerCase();
          const cleanVal = String(val || '').trim();
          return (cleanKey === titleKey.toLowerCase() || /title|key|name/i.test(cleanKey)) && 
                 (cleanVal.toLowerCase() === item.title.toLowerCase() || item.matchRegex.test(cleanVal));
        });
      });

      const rowData = {
        [titleKey]: item.title,
        [descKey]: item.value,
      };

      if (existingRow) {
        const titleCellKey = Object.keys(existingRow).find(k => k.trim().toLowerCase() === titleKey.toLowerCase()) || titleKey;
        const currentTitleVal = existingRow[titleCellKey] || item.title;
        await updateRowInSheet(
          targetSpreadsheetId,
          '0',
          titleCellKey,
          currentTitleVal,
          rowData,
          targetWebAppUrl
        );
      } else {
        await addRowToSheet(
          targetSpreadsheetId,
          '0',
          rowData,
          targetWebAppUrl
        );
      }
    }

    return {
      success: true,
      message: `Configuration saved and synced to Google Sheet (GID: 0) successfully!`
    };
  } catch (error: any) {
    console.error("Failed to save app config to Settings sheet (GID 0):", error);
    return {
      success: false,
      error: error.message || "Failed to save configuration to GID 0",
    };
  }
}

/**
 * Fetches application configuration saved in GID 0 (Settings sheet)
 * and returns the active parameters for the app.
 */
export async function fetchAppConfigFromSheet(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<Partial<{ spreadsheetId: string; webAppUrl: string; folderPath: string }> | null> {
  try {
    const { rows } = await fetchSheetData(spreadsheetId, '0');
    if (!rows || rows.length === 0) return null;

    const parsedConfig: Partial<{ spreadsheetId: string; webAppUrl: string; folderPath: string }> = {};

    rows.forEach((row) => {
      let titleVal = '';
      let descVal = '';

      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase();
        const strVal = String(val ?? '').trim();
        if (/^(title|key|name|setting|field)/i.test(cleanKey)) {
          titleVal = strVal;
        } else if (/^(description|value|val|data|content)/i.test(cleanKey)) {
          descVal = strVal;
        }
      }

      if (!titleVal && !descVal) {
        const values = Object.values(row);
        if (values.length >= 2) {
          titleVal = String(values[0] ?? '').trim();
          descVal = String(values[1] ?? '').trim();
        }
      }

      if (titleVal && descVal) {
        if (/spreadsheet\s*id/i.test(titleVal)) {
          parsedConfig.spreadsheetId = descVal;
        } else if (/apps\s*script|web\s*app\s*url/i.test(titleVal)) {
          parsedConfig.webAppUrl = descVal;
        } else if (/target\s*folder|drive.*folder|folder\s*path/i.test(titleVal)) {
          parsedConfig.folderPath = descVal;
        } else if (/^app\s*config/i.test(titleVal)) {
          try {
            const json = JSON.parse(descVal);
            if (json.spreadsheetId) parsedConfig.spreadsheetId = json.spreadsheetId;
            if (json.webAppUrl) parsedConfig.webAppUrl = json.webAppUrl;
            if (json.folderPath) parsedConfig.folderPath = json.folderPath;
          } catch {}
        }
      }
    });

    if (parsedConfig.spreadsheetId || parsedConfig.webAppUrl || parsedConfig.folderPath) {
      return parsedConfig;
    }
    return null;
  } catch (err) {
    console.warn("Could not fetch app config from Settings sheet (GID 0):", err);
    return null;
  }
}

/**
 * Saves or updates sheet tabs configuration (including visibility/hidden status) to Settings sheet (GID: 0).
 */
export async function saveSheetTabsConfigToSheet(
  spreadsheetId: string,
  tabs: SheetTab[],
  webAppUrl: string = DEFAULT_WEB_APP_URL
): Promise<SheetOperationResponse> {
  try {
    const targetSpreadsheetId = spreadsheetId.trim() || DEFAULT_SPREADSHEET_ID;
    const targetWebAppUrl = webAppUrl.trim() || DEFAULT_WEB_APP_URL;

    let existingRows: Record<string, any>[] = [];
    let headers: string[] = [];
    try {
      const data = await fetchSheetData(targetSpreadsheetId, '0');
      existingRows = data.rows;
      headers = data.headers;
    } catch {}

    const titleKey = headers.find(h => /^(title|key|name|setting|field)/i.test(h.trim())) || 'Title';
    const descKey = headers.find(h => /^(description|value|val|data|content)/i.test(h.trim())) || 'Description';

    const expectedTitle = 'Sheet Tabs Configuration';

    const existingRow = existingRows.find((r) => {
      return Object.entries(r).some(([key, val]) => {
        const cleanKey = key.trim().toLowerCase();
        const cleanVal = String(val || '').trim();
        return (cleanKey === titleKey.toLowerCase() || /title|key|name/i.test(cleanKey)) &&
               /sheet\s*tabs\s*config/i.test(cleanVal);
      });
    });

    const tabsPayload = tabs.map((t) => ({
      id: t.id,
      name: t.name,
      gid: String(t.gid),
      hidden: !!t.hidden,
    }));

    const rowData = {
      [titleKey]: expectedTitle,
      [descKey]: JSON.stringify(tabsPayload),
    };

    if (existingRow) {
      const titleCellKey = Object.keys(existingRow).find(k => k.trim().toLowerCase() === titleKey.toLowerCase()) || titleKey;
      const currentTitleVal = existingRow[titleCellKey] || expectedTitle;
      await updateRowInSheet(
        targetSpreadsheetId,
        '0',
        titleCellKey,
        currentTitleVal,
        rowData,
        targetWebAppUrl
      );
    } else {
      await addRowToSheet(
        targetSpreadsheetId,
        '0',
        rowData,
        targetWebAppUrl
      );
    }

    return {
      success: true,
      message: 'Sheet tabs configuration saved to Settings sheet (GID: 0)',
    };
  } catch (error: any) {
    console.error('Failed to save sheet tabs config to Settings sheet (GID 0):', error);
    return {
      success: false,
      error: error.message || 'Failed to save sheet tabs configuration',
    };
  }
}

/**
 * Fetches sheet tabs configuration (including visibility/hidden status) from Settings sheet (GID: 0).
 */
export async function fetchSheetTabsConfigFromSheet(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<SheetTab[] | null> {
  try {
    const { rows } = await fetchSheetData(spreadsheetId, '0');
    if (!rows || rows.length === 0) return null;

    for (const row of rows) {
      let titleVal = '';
      let descVal = '';

      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase();
        const strVal = String(val ?? '').trim();
        if (/^(title|key|name|setting|field)/i.test(cleanKey)) {
          titleVal = strVal;
        } else if (/^(description|value|val|data|content)/i.test(cleanKey)) {
          descVal = strVal;
        }
      }

      if (/sheet\s*tabs\s*config/i.test(titleVal) && descVal) {
        try {
          const parsed = JSON.parse(descVal);
          if (Array.isArray(parsed)) {
            return parsed as SheetTab[];
          }
        } catch {}
      }
    }
    return null;
  } catch (err) {
    console.warn("Could not fetch sheet tabs config from Settings sheet (GID 0):", err);
    return null;
  }
}
