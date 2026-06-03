/**
 * Minimal route loader — a single spinning ring shown on initial site load
 * and as the Suspense fallback for lazy-loaded routes. Styling lives in
 * App.css under `.route-loader*`.
 */
export default function RouteLoader() {
  return (
    <div className="route-loader" role="status" aria-live="polite" aria-label="Loading">
      <span className="route-loader-spinner" />
    </div>
  );
}
