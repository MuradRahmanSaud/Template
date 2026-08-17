export const DEFAULT_SPREADSHEET_ID = "1EyQb90JTZBE-phZuQL12yJe0A4hdYISH-FFkepyazcg";

export default async function handler(req: any, res: any) {
  try {
    const spreadsheetId = (req.query?.spreadsheetId as string) || DEFAULT_SPREADSHEET_ID;
    const gid = (req.query?.gid as string) || "0";
    const timestamp = Date.now();

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    // Strategy 1: GViz CSV export endpoint
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}&_t=${timestamp}`;
    let response = await fetch(gvizUrl, { headers });

    // Strategy 2: Standard CSV export endpoint
    if (!response.ok) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}&_t=${timestamp}`;
      response = await fetch(csvUrl, { headers });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Google Sheet fetch failed with status ${response.status}. Please verify that the sheet sharing is set to 'Anyone with the link can view'.`,
      });
    }

    const csvText = await response.text();

    if (csvText.trim().startsWith("<!DOCTYPE html>") || csvText.trim().startsWith("<html")) {
      return res.status(403).json({
        success: false,
        error: "Google Sheet is restricted or private. Please change sharing setting to 'Anyone with the link can view'.",
      });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(csvText);
  } catch (error: any) {
    console.error("Error fetching sheet CSV in serverless route:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch sheet data",
    });
  }
}
