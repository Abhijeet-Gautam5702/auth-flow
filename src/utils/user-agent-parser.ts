// Utility function to parse the user-agent header of an API-request

import { DeviceType, UserAgent } from "../types/types";

export const parseUserAgent = (userAgent: string) => {
  // Store the complete user agent
  const completeUserAgent = userAgent;

  // Detect device type (mobile or desktop)
  const isMobile =
    /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(
      userAgent
    );
  const deviceType = isMobile ? DeviceType.mobile : DeviceType.desktop;

  // Detect operating system
  let operatingSystem = "unknown";

  if (/Windows/i.test(userAgent)) operatingSystem = "Windows";
  else if (/iPhone|iPad|iPod/.test(userAgent)) operatingSystem = "iOS";
  else if (/Mac OS X/.test(userAgent)) operatingSystem = "macOS";
  else if (/Android/.test(userAgent)) operatingSystem = "Android";
  else if (/Linux/.test(userAgent)) operatingSystem = "Linux";
  else if (/CrOS/.test(userAgent)) operatingSystem = "Chrome OS";

  return {
    userAgent: completeUserAgent,
    os: operatingSystem,
    deviceType,
  };
};
