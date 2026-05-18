import { useEffect } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { SyncStatusBanner } from "@/components/sync-status-banner";
import { initPlatformSync } from "@/lib/platform-sync";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Lotto Runners" },
      { name: "theme-color", content: "#2563EB" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Lotto Runners" },
      { name: "application-name", content: "Lotto Runners" },
      { name: "description", content: "Errands, rides, deliveries & trucks on demand. Live map, real-time tracking." },
      { name: "author", content: "Lotto Runners" },
      { property: "og:title", content: "Lotto Runners" },
      { property: "og:description", content: "Errands, rides, deliveries & trucks on demand. Live map, real-time tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lotto Runners" },
      { name: "twitter:description", content: "Errands, rides, deliveries & trucks on demand. Live map, real-time tracking." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rhplFQjOCBP6KivFZfjgla4nf8o2/social-images/social-1777905575009-close-up-delivery-person-giving-parcel-client.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rhplFQjOCBP6KivFZfjgla4nf8o2/social-images/social-1777905575009-close-up-delivery-person-giving-parcel-client.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        href: "/icon-192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        href: "/icon-512.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    void import("../register-pwa");
    void initPlatformSync();
  }, []);
  return (
    <>
      <SyncStatusBanner />
      <Outlet />
    </>
  );
}
