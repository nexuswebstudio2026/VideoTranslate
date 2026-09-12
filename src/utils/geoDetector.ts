export interface DetectedLocation {
  country: "Colombia" | "Estados Unidos" | "Otro";
  countryCode: "CO" | "US" | "OTHER";
  city: string;
  locationName: string;
  role: "colombia" | "boston";
  nativeLanguage: "es" | "en";
  targetLanguage: "en" | "es";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  method: "gps" | "reverse-geocode" | "timezone";
  flag: string;
}

/**
 * Checks if coordinates fall within Colombia bounding box
 */
export function isCoordsInColombia(lat: number, lon: number): boolean {
  return lat >= -4.5 && lat <= 13.5 && lon >= -79.2 && lon <= -66.8;
}

/**
 * Checks if coordinates fall within USA bounding box (continental + Alaska + Hawaii)
 */
export function isCoordsInUSA(lat: number, lon: number): boolean {
  // Continental USA
  const isContinental = lat >= 24.3 && lat <= 49.5 && lon >= -125.0 && lon <= -66.8;
  // Alaska
  const isAlaska = lat >= 51.0 && lat <= 72.0 && lon >= -170.0 && lon <= -130.0;
  // Hawaii
  const isHawaii = lat >= 18.0 && lat <= 23.0 && lon >= -161.0 && lon <= -154.0;
  return isContinental || isAlaska || isHawaii;
}

/**
 * Fallback to browser timezone detection
 */
export function detectLocationByTimezone(): DetectedLocation {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const tzLower = tz.toLowerCase();

  if (tzLower.includes("bogota") || tzLower.includes("colombia")) {
    return {
      country: "Colombia",
      countryCode: "CO",
      city: "Bogotá",
      locationName: "Bogotá, Colombia",
      role: "colombia",
      nativeLanguage: "es",
      targetLanguage: "en",
      method: "timezone",
      flag: "🇨🇴",
    };
  }

  if (
    tzLower.includes("new_york") ||
    tzLower.includes("boston") ||
    tzLower.includes("chicago") ||
    tzLower.includes("denver") ||
    tzLower.includes("los_angeles") ||
    tzLower.includes("detroit") ||
    tzLower.includes("phoenix") ||
    tzLower.includes("anchorage") ||
    tzLower.includes("honolulu") ||
    tzLower.includes("america/")
  ) {
    const isBoston = tzLower.includes("new_york") || tzLower.includes("boston");
    return {
      country: "Estados Unidos",
      countryCode: "US",
      city: isBoston ? "Boston, MA" : "Estados Unidos",
      locationName: isBoston ? "Boston, Massachusetts, EE. UU." : "Estados Unidos",
      role: "boston",
      nativeLanguage: "en",
      targetLanguage: "es",
      method: "timezone",
      flag: "🇺🇸",
    };
  }

  // Default to Colombia
  return {
    country: "Colombia",
    countryCode: "CO",
    city: "Bogotá",
    locationName: "Colombia",
    role: "colombia",
    nativeLanguage: "es",
    targetLanguage: "en",
    method: "timezone",
    flag: "🇨🇴",
  };
}

/**
 * Request browser Geolocation and determine whether user is in Colombia or USA
 */
export async function detectUserLocation(): Promise<DetectedLocation> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return detectLocationByTimezone();
  }

  return new Promise<DetectedLocation>((resolve) => {
    let resolved = false;

    // Timeout safety: if user ignores prompt or takes too long, resolve with timezone
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(detectLocationByTimezone());
      }
    }, 9000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        const { latitude, longitude, accuracy } = pos.coords;
        const inCO = isCoordsInColombia(latitude, longitude);
        const inUS = isCoordsInUSA(latitude, longitude);

        // Try reverse geocoding via OpenStreetMap for real city name
        let cityName = inCO ? "Bogotá" : inUS ? "Boston, MA" : "Ubicación detectada";
        let countryDetected: "Colombia" | "Estados Unidos" | "Otro" = inCO
          ? "Colombia"
          : inUS
          ? "Estados Unidos"
          : "Otro";
        let countryCode: "CO" | "US" | "OTHER" = inCO ? "CO" : inUS ? "US" : "OTHER";

        try {
          const controller = new AbortController();
          const reverseTimer = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              signal: controller.signal,
              headers: { "Accept-Language": "es" },
            }
          );
          clearTimeout(reverseTimer);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const code = (addr.country_code || "").toUpperCase();
            if (code === "CO") {
              countryDetected = "Colombia";
              countryCode = "CO";
              cityName = addr.city || addr.town || addr.state || "Colombia";
            } else if (code === "US") {
              countryDetected = "Estados Unidos";
              countryCode = "US";
              cityName = addr.city || addr.town || (addr.state ? `${addr.state}, EE. UU.` : "Boston, MA");
            }
          }
        } catch {
          // Fallback to bounding box logic already calculated
        }

        const isBostonRole = countryCode === "US";
        resolve({
          country: countryDetected,
          countryCode,
          city: cityName,
          locationName: `${cityName}, ${countryDetected}`,
          role: isBostonRole ? "boston" : "colombia",
          nativeLanguage: isBostonRole ? "en" : "es",
          targetLanguage: isBostonRole ? "es" : "en",
          latitude,
          longitude,
          accuracy,
          method: "gps",
          flag: countryCode === "CO" ? "🇨🇴" : countryCode === "US" ? "🇺🇸" : "📍",
        });
      },
      (err) => {
        console.warn("Geolocation permission error or unavailable:", err.message);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(detectLocationByTimezone());
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}
