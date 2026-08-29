import { logger } from "../logging/logger";

export type ExtractedData = {
  title?: string | null;
  description?: string | null;
  companyName?: string | null;
  skills: string[];
  imageUrl?: string | null;
  sourceEmail?: string | null;
  socialLinks?: Record<string, string[]>;
  keywords: string[];
  fetchedAt?: string;
};

export async function extractFromUrl(url: string): Promise<ExtractedData | null> {
  const baseUrl = process.env.SCRAPER_BASE_URL;
  const deviceId = process.env.SCRAPER_DEVICE_ID;
  if (!baseUrl || !deviceId) {
    logger.warn("Scraper configuration is missing");
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/metadata/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const payload = await response.json() as any;
      if (response.status !== 200) {
        logger.warn("Scraper returned an error", { errorCode: payload?.error, message: payload?.message });
        return null;
      }
      const metadata = payload.metadata ?? {};
      return {
        title: metadata.ogTitle ?? metadata.title ?? null,
        description: metadata.ogDescription ?? metadata.description ?? null,
        companyName: metadata.siteName ?? null,
        skills: [],
        imageUrl: metadata.ogImage ?? payload.images?.[0] ?? null,
        sourceEmail: payload.emails?.[0] ?? null,
        socialLinks: payload.social ?? {},
        keywords: metadata.keywords ?? [],
        fetchedAt: payload.fetchedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.warn("Scraper extraction failed", { error: String(error) });
    return null;
  }
}
