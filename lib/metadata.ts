import * as cheerio from "cheerio";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

/** URL에서 OG 메타데이터를 크롤링한다. 실패하면 null 필드로 반환 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const empty: LinkMetadata = { title: null, description: null, image: null, favicon: null };

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Stash/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return empty;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    const html = await res.text();
    const $ = cheerio.load(html);

    const og = (prop: string) =>
      $(`meta[property="og:${prop}"]`).attr("content") ??
      $(`meta[name="${prop}"]`).attr("content") ??
      null;

    const title =
      og("title") ??
      ($("title").first().text().trim() || null);

    const description =
      og("description") ??
      $('meta[name="Description"]').attr("content") ??
      $('meta[property="twitter:description"]').attr("content") ??
      $('meta[name="twitter:description"]').attr("content") ??
      null;
    const image = resolveUrl(og("image"), url);

    // 파비콘: <link rel="icon"> 계열 우선, 없으면 /favicon.ico
    const faviconHref =
      $('link[rel="icon"]').attr("href") ??
      $('link[rel="shortcut icon"]').attr("href") ??
      $('link[rel="apple-touch-icon"]').attr("href") ??
      "/favicon.ico";
    const favicon = resolveUrl(faviconHref, url);

    return { title, description, image, favicon };
  } catch {
    return empty;
  }
}

/** 상대 경로를 절대 URL로 변환 */
function resolveUrl(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/** text/title 파라미터에서 URL 정규식 추출 */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
