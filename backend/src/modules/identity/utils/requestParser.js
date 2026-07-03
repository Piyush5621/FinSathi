export function parseRequestInfo(req) {
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  
  // Extract browser
  let browser = "Unknown";
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";
  else if (userAgent.includes("Trident")) browser = "Internet Explorer";
  else if (userAgent.includes("Edge") || userAgent.includes("Edg")) browser = "Edge";
  else if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";

  // Extract OS
  let operatingSystem = "Unknown";
  if (userAgent.includes("Windows NT 10.0")) operatingSystem = "Windows 10/11";
  else if (userAgent.includes("Windows NT 6.2")) operatingSystem = "Windows 8";
  else if (userAgent.includes("Windows NT 6.1")) operatingSystem = "Windows 7";
  else if (userAgent.includes("Android")) operatingSystem = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) operatingSystem = "iOS";
  else if (userAgent.includes("Macintosh")) operatingSystem = "macOS";
  else if (userAgent.includes("Linux")) operatingSystem = "Linux";

  return {
    userAgent,
    ipAddress: ipAddress.split(",")[0].trim(),
    deviceName: req.headers["x-device-name"] || null,
    deviceId: req.headers["x-device-id"] || null,
    platform: req.headers["x-device-platform"] || req.headers["sec-ch-ua-platform"] || null,
    browser,
    operatingSystem,
    appVersion: req.headers["x-app-version"] || null
  };
}
