// 배포마다 VERCEL_GIT_COMMIT_SHA가 바뀌므로 캐시 버전 자동 갱신
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "dev";
const CACHE_NAME = `stash-${VERSION}`;

const SW = `
const CACHE_NAME = "${CACHE_NAME}";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/manifest.json"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API는 항상 네트워크
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML 페이지는 네트워크 우선 (캐시 폴백)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request));
    })
  );
});
`.trim();

export async function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
