import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const OG_TOTAL_TAPS = 15_605;
const OG_TARGET = 10_000_000;
const OG_PROGRESS = (OG_TOTAL_TAPS / OG_TARGET) * 100;
const formatNumber = new Intl.NumberFormat("en-US");

const ogProgressStyles = buildStyles({
  pathColor: "#292a2d",
  trailColor: "#ecece8",
  strokeLinecap: "round",
  pathTransition: "none",
});

export function OgPreview() {
  return (
    <main className="og-preview-shell" aria-label="ChatGPT Reset social preview">
      <header className="og-preview-header">
        <h1>ChatGPT Reset</h1>
        <p>30 days left</p>
      </header>

      <section className="og-preview-hero" aria-label="Reset hero preview">
        <div className="og-preview-copy">
          <h2>Tap for reset</h2>
          <p>10,000,000 taps = 1 collective reset</p>
        </div>

        <div className="og-preview-stat og-preview-stat-personal">
          <span>My taps</span>
          <strong>45</strong>
        </div>

        <div className="og-preview-center">
          <div className="og-preview-control">
            <div className="og-preview-ring" aria-hidden="true">
              <CircularProgressbar
                value={OG_PROGRESS}
                strokeWidth={2.4}
                styles={ogProgressStyles}
              />
            </div>
            <div className="og-preview-button">Tap for reset</div>
          </div>

          <p className="og-preview-remaining">
            <strong>{formatNumber.format(OG_TARGET - OG_TOTAL_TAPS)}</strong>
            <span>(taps for next reset)</span>
          </p>
        </div>

        <div className="og-preview-stat og-preview-stat-total">
          <span>Total taps</span>
          <strong>{formatNumber.format(OG_TOTAL_TAPS)}/{formatNumber.format(OG_TARGET)}</strong>
        </div>
      </section>

      <footer className="og-preview-footer">
        <span>Unofficial internet experiment.</span>
        <span>Not affiliated with OpenAI.</span>
      </footer>
    </main>
  );
}
