export const DEFAULT_SPREADSHEET_ID = "1EyQb90JTZBE-phZuQL12yJe0A4hdYISH-FFkepyazcg";

export default async function handler(req: any, res: any) {
  try {
    const spreadsheetId = (req.query?.spreadsheetId as string) || DEFAULT_SPREADSHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/htmlview?_t=${Date.now()}`;

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

    return res.status(200).json({
      success: true,
      tabs: tabs.length > 0 ? tabs : [
        { id: 'tab-1049214616', name: 'My Profile', gid: '1049214616' },
        { id: 'tab-1370498482', name: 'Activity', gid: '1370498482' }
      ],
    });
  } catch (error: any) {
    console.error("Error fetching sheet tabs in serverless route:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch sheet tabs",
      tabs: [
        { id: 'tab-1049214616', name: 'My Profile', gid: '1049214616' },
        { id: 'tab-1370498482', name: 'Activity', gid: '1370498482' }
      ]
    });
  }
}
