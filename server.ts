import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DEFAULT_SPREADSHEET_ID, DEFAULT_WEB_APP_URL, DEFAULT_FOLDER_PATH } from "./src/config";

const app = express();
const PORT = 3000;

// Enable large payloads for base64 file and image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

export { DEFAULT_SPREADSHEET_ID, DEFAULT_WEB_APP_URL, DEFAULT_FOLDER_PATH };

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Update src/config.ts on disk when configuration changes from application
app.post("/api/update-config-file", async (req, res) => {
  try {
    const { spreadsheetId, webAppUrl, folderPath } = req.body;
    const configFilePath = path.join(process.cwd(), "src", "config.ts");

    const fileContent = `/**
 * ============================================================================
 * GOOGLE SHEET & APPS SCRIPT CONFIGURATION
 * ============================================================================
 * আপনি যদি কোড থেকে ম্যানুয়ালি আপনার Google Sheet ID এবং Web App URL পরিবর্তন করতে চান,
 * তবে নিচের মানগুলো পরিবর্তন করলেই অ্যাপের সর্বত্র তা আপডেট হয়ে যাবে।
 * 
 * If you want to change your Google Sheet ID and Web App URL manually from code,
 * update them below and it will reflect across the application.
 * ============================================================================
 */

export const DEFAULT_SPREADSHEET_ID = "${spreadsheetId || DEFAULT_SPREADSHEET_ID}";

export const DEFAULT_WEB_APP_URL = "${webAppUrl || DEFAULT_WEB_APP_URL}";

export const DEFAULT_FOLDER_PATH = "${folderPath || DEFAULT_FOLDER_PATH}";
`;

    fs.writeFileSync(configFilePath, fileContent, "utf-8");
    return res.json({ success: true, message: "config.ts updated successfully" });
  } catch (error: any) {
    console.error("Failed to update config.ts:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update config.ts" });
  }
});

// API: Fetch all sheet tabs (names and GIDs) directly from Google Sheet
app.get("/api/sheet-tabs", async (req, res) => {
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || DEFAULT_SPREADSHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview?_t=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Could not retrieve sheet metadata (${response.status})`,
      });
    }

    const html = await response.text();
    const itemsRegex = /items\.push\(\{\s*name:\s*"([^"]+)",\s*pageUrl:\s*"([^"]+)",\s*gid:\s*"([^"]+)"/g;
    let match;
    const tabs: Array<{ id: string; name: string; gid: string }> = [];

    while ((match = itemsRegex.exec(html)) !== null) {
      // Decode unicode/hex escape sequences if any
      let sheetName = match[1];
      try {
        sheetName = JSON.parse(`"${sheetName}"`);
      } catch {}
      
      tabs.push({
        id: `tab-${match[3]}`,
        name: sheetName.trim(),
        gid: match[3].trim(),
      });
    }

    // Secondary fallback regex if items.push is not present
    if (tabs.length === 0) {
      const buttonRegex = /id="sheet-button-([^"]+)"[^>]*><a[^>]*>([^<]+)<\/a>/g;
      while ((match = buttonRegex.exec(html)) !== null) {
        tabs.push({
          id: `tab-${match[1]}`,
          name: match[2].trim(),
          gid: match[1].trim(),
        });
      }
    }

    return res.json({
      success: true,
      tabs: tabs.length > 0 ? tabs : [
        { id: 'tab-1049214616', name: 'My Profile', gid: '1049214616' },
        { id: 'tab-1370498482', name: 'Activity', gid: '1370498482' }
      ],
    });
  } catch (error: any) {
    console.error("Error fetching sheet tabs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch sheet tabs",
      tabs: [
        { id: 'tab-1049214616', name: 'My Profile', gid: '1049214616' },
        { id: 'tab-1370498482', name: 'Activity', gid: '1370498482' }
      ]
    });
  }
});

// API: Fetch Google Sheet CSV data with cache busting and fallback strategies
app.get("/api/sheet-data", async (req, res) => {
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || DEFAULT_SPREADSHEET_ID;
    const gid = (req.query.gid as string) || "0";
    const timestamp = Date.now();

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    // Strategy 1: GViz CSV export endpoint (Most reliable for public sheets)
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}&_t=${timestamp}`;
    
    let response = await fetch(gvizUrl, { headers });

    // Strategy 2: Standard CSV export endpoint if gviz did not succeed
    if (!response.ok) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}&_t=${timestamp}`;
      response = await fetch(csvUrl, { headers });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Google Sheet fetch failed with status ${response.status}. Please ensure the sheet sharing is set to 'Anyone with the link can view'.`,
      });
    }

    const csvText = await response.text();

    // Check if Google returned an HTML login or error page instead of raw CSV
    if (csvText.trim().startsWith("<!DOCTYPE html>") || csvText.trim().startsWith("<html")) {
      return res.status(403).json({
        success: false,
        error: "Google Sheet is restricted or private. Please change sharing setting to 'Anyone with the link can view'.",
      });
    }

    // If CSV text is empty (newly created sheet without rows), provide default headers CSV
    const finalCsv = csvText.trim() === "" ? "Title,Description,Status\n" : csvText;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(finalCsv);
  } catch (error: any) {
    console.error("Error fetching sheet CSV:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch sheet data",
    });
  }
});

// API: Proxy Google Apps Script Web App requests (handles CORS and 302 redirects automatically)
app.post("/api/appscript", async (req, res) => {
  try {
    const webAppUrl = (req.headers["x-web-app-url"] as string) || DEFAULT_WEB_APP_URL;
    const payload = req.body;

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const responseText = await response.text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
    } catch {
      console.error("Apps Script returned non-JSON response. Likely an HTML error page due to invalid URL or permissions.");
      jsonResult = { 
        success: false, 
        error: "Failed to connect to Google Apps Script. Please verify that your Web App URL is correct, deployed with 'Who has access: Anyone', and that your Google Workspace allows public web apps.", 
        raw: responseText 
      };
    }

    return res.json(jsonResult);
  } catch (error: any) {
    console.error("Error communicating with Google Apps Script:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Apps Script request failed",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
