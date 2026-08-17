export const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxPWayuGdnRlzk_EFgnHUk0b_E650VHX7t39XUf7iHGbGP0Xyypphmv0kNjujfUD1WBcA/exec";

export default async function handler(req: any, res: any) {
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
      jsonResult = { 
        success: false, 
        error: "Failed to connect to Google Apps Script. Please verify that your Web App URL is correct and deployed with 'Who has access: Anyone'.", 
        raw: responseText 
      };
    }

    return res.status(200).json(jsonResult);
  } catch (error: any) {
    console.error("Error communicating with Google Apps Script in serverless route:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Apps Script request failed",
    });
  }
}
