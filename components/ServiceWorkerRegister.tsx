"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if ("serviceWorker" in navigator) {
      const hadController = !!navigator.serviceWorker.controller;

      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("[SW] 등록 실패:", err));

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) window.location.reload();
      });
    }
  }, []);

  return null;
}
