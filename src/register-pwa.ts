/**
 * Manual registration avoids `virtual:pwa-register`, which TanStack Start's SSR / multi-env
 * pipeline does not always resolve. `/sw.js` is emitted to the client build output in production.
 */
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    void navigator.serviceWorker
      .register("/sw.js", { type: "classic", scope: "/" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {
        // Missing sw.js: ignore so the app still runs.
      });
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  }
}
