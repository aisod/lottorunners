interface HistoryLike {
  canGoBack: () => boolean;
  back: () => void;
}

/**
 * Prefer the in-app history stack when available, but stay inside the
 * customer flow if this page was opened directly.
 */
export function goBackOrFallback(history: HistoryLike, fallback: () => void) {
  if (history.canGoBack()) {
    history.back();
    return;
  }

  fallback();
}
