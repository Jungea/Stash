self.addEventListener("install", () => {
  self.skipWaiting(); // 새 버전 즉시 활성화
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim()); // 열려있는 모든 탭 즉시 제어
});

// 네트워크 요청은 그대로 통과 (캐싱 없음, 항상 최신 리소스)
self.addEventListener("fetch", () => {});
