"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("[SW] 등록 실패:", err));

    // 새 SW가 활성화되면 페이지 새로고침 (첫 설치는 제외)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) window.location.reload();
    });
  }, []);

  return null;
}
