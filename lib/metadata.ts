import * as cheerio from "cheerio";
import { assertSafeHttpUrl, fetchPublicUrl, readTextLimited } from "@/lib/security";

export interface LinkMetadata {
  image: string | null;
}

/** URL에서 OG 이미지만 크롤링한다. 실패하면 null 반환 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const empty: LinkMetadata = { image: null };

  try {
    // 내부 주소는 저장할 수 있지만, 배포 서버가 해당 주소로 요청하지 않도록 한다.
    await assertSafeHttpUrl(url);
    const res = await fetchPublicUrl(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Stash/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return empty;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    const html = await readTextLimited(res);
    const $ = cheerio.load(html);

    const image = resolveUrl(
      $('meta[property="og:image"]').attr("content") ?? null,
      url
    );

    if (image) await assertSafeHttpUrl(image);

    return { image };
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
