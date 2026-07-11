export function OgPreview() {
  return (
    <main className="og-preview-shell" aria-label="ChatGPT Reset social preview">
      <img
        className="og-preview-art"
        src="/assets/og-reset-3d-v1.png"
        alt=""
        aria-hidden="true"
      />
      <div className="og-preview-shade" aria-hidden="true" />

      <header className="og-preview-header">
        <p>ChatGPT Reset</p>
        <p>0/3 resets earned</p>
      </header>

      <section className="og-preview-copy" aria-label="Campaign message">
        <p className="og-preview-eyebrow">An unofficial internet experiment</p>
        <h1>
          <span>10,000,000 taps.</span>
          <span>One ChatGPT reset.</span>
        </h1>
      </section>

      <footer className="og-preview-footer">
        <span>chatgptreset.com</span>
        <span>Not affiliated with OpenAI.</span>
      </footer>
    </main>
  );
}
