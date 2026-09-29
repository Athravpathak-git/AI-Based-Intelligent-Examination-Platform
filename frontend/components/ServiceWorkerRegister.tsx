"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Register Service Worker in production or when supported
    if ("serviceWorker" in navigator) {
      // Avoid service worker interference during hot-reload development
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Service worker successfully registered
          })
          .catch((error) => {
            console.warn("ServiceWorker registration failed:", error);
          });
      }
    }

    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      (window as any).__pwaInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa_install_available", { detail: e }));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      (window as any).__pwaInstallPrompt = null;
      window.dispatchEvent(new CustomEvent("pwa_installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
