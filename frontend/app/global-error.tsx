"use client";

/**
 * Last resort, when the root layout itself fails: it replaces the whole
 * document, so it brings its own <html> and <body> and inlines the few
 * colors it needs rather than relying on globals.css.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0b0d",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <main>
          <h1 style={{ fontSize: 32, margin: "0 0 8px" }}>Something broke on our side.</h1>
          <p style={{ color: "#9c9ca5", margin: "0 0 24px" }}>Reload the page to try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 48,
              padding: "0 24px",
              border: "none",
              borderRadius: 9999,
              background: "#d7ff3d",
              color: "#0b0b0d",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
