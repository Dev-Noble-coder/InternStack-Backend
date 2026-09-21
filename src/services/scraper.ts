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
  jobTitle?: string | null;
  jobDescription?: string | null;
  employmentType?: string | null;
  applicationDeadline?: string | null;
  locations?: string[];
  applicationUrl?: string | null;
  hiringOrganizationName?: string | null;
  hiringOrganizationLogo?: string | null;
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
        body: JSON.stringify({
          url,
          // Set to true for JS-heavy pages (slower, requires
          // Playwright to be enabled on the scraper server).
          // Keep false for standard company career pages.
          render: false,
          // Specify which extractors to run.
          // Expand this list as InternStack needs more data.
          extract: {
            metadata: true,
            emails: true,
            social: true,
            images: true,
            links: false,
            content: false,
            techStack: false
          }
        }),
        signal: controller.signal,
      });
      const payload = await response.json() as any;
      if (response.status !== 200) {
        logger.warn("Scraper returned an error", { errorCode: payload?.error, message: payload?.message });
        return null;
      }
      const metadata = payload.metadata ?? {};
      const jobPosting = payload.jobPosting ?? null;
      return {
        title: metadata.ogTitle ?? metadata.title ?? null,
        description: metadata.ogDescription ?? metadata.description ?? null,
        companyName: jobPosting?.hiringOrganization?.name ?? metadata.siteName ?? null,
        skills: [],
        imageUrl: jobPosting?.hiringOrganization?.logo ?? metadata.ogImage ?? payload.images?.[0] ?? null,
        sourceEmail: payload.emails?.[0] ?? null,
        socialLinks: payload.social ?? {},
        keywords: metadata.keywords ?? [],
        fetchedAt: payload.fetchedAt,
        jobTitle: jobPosting?.title ?? null,
        jobDescription: jobPosting?.description ?? null,
        employmentType: jobPosting?.employmentType ?? null,
        applicationDeadline: jobPosting?.validThrough ?? null,
        locations: jobPosting?.jobLocation ?? [],
        applicationUrl: jobPosting?.applicationUrl ?? null,
        hiringOrganizationName: jobPosting?.hiringOrganization?.name ?? null,
        hiringOrganizationLogo: jobPosting?.hiringOrganization?.logo ?? null,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.warn("Scraper extraction failed", { error: String(error) });
    return null;
  }
}
