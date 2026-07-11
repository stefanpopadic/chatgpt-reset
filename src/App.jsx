import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { LogoPhysics } from "./LogoPhysics.jsx";

const RESET_TARGET = 10_000_000;
const MAX_RESETS = 3;
const formatNumber = new Intl.NumberFormat("en-US");
const buttonProgressStyles = buildStyles({
  pathColor: "#292a2d",
  trailColor: "#ecece8",
  strokeLinecap: "round",
  pathTransition: "stroke-dashoffset 280ms cubic-bezier(0.22, 1, 0.36, 1)",
});

function daysRemaining(endsAt) {
  if (!endsAt) return 30;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

export function App() {
  const [campaign, setCampaign] = useState({ tapCount: 0, myTapCount: 0, endsAt: null });
  const [status, setStatus] = useState("loading");
  const buttonRef = useRef(null);
  const physicsRef = useRef(null);
  const pressTimerRef = useRef(null);
  const tapAudioRef = useRef(null);
  const tapProofRef = useRef("");
  const cooldownTimerRef = useRef(null);
  const cooldownUntilRef = useRef(0);

  useEffect(() => {
    let active = true;

    fetch("/api/counter")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the global counter.");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        tapProofRef.current = data.tapProof ?? "";
        setCampaign(data);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    window.clearTimeout(pressTimerRef.current);
    window.clearTimeout(cooldownTimerRef.current);
    tapAudioRef.current?.pause();
  }, []);

  const progress = useMemo(
    () => ((campaign.tapCount % RESET_TARGET) / RESET_TARGET) * 100,
    [campaign.tapCount],
  );
  const tapsToNextReset = campaign.tapCount % RESET_TARGET === 0 && campaign.tapCount > 0
    ? RESET_TARGET
    : RESET_TARGET - (campaign.tapCount % RESET_TARGET);
  const resetsEarned = Math.floor(campaign.tapCount / RESET_TARGET);
  const myTapCount = campaign.myTapCount ?? 0;
  const daysLeft = daysRemaining(campaign.endsAt);

  function playTapSound() {
    const audio = tapAudioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 0.38;
    void audio.play().catch(() => {});
  }

  function animateButton() {
    const button = buttonRef.current;
    if (!button) return;

    window.clearTimeout(pressTimerRef.current);
    button.classList.remove("is-pressed");
    void button.offsetWidth;
    button.classList.add("is-pressed");
    pressTimerRef.current = window.setTimeout(() => {
      button.classList.remove("is-pressed");
    }, 220);
  }

  function rollbackOptimisticTap() {
    setCampaign((current) => ({
      ...current,
      tapCount: Math.max(0, current.tapCount - 1),
      myTapCount: Math.max(0, (current.myTapCount ?? 0) - 1),
    }));
  }

  async function addTap(event) {
    const isTrustedInteraction = event?.nativeEvent?.isTrusted ?? event?.isTrusted;
    if (
      isTrustedInteraction === false
      || !tapProofRef.current
      || Date.now() < cooldownUntilRef.current
    ) return;

    const buttonBounds = buttonRef.current?.getBoundingClientRect();
    physicsRef.current?.spawn({
      x: buttonBounds ? buttonBounds.left + buttonBounds.width / 2 : undefined,
      y: buttonBounds ? buttonBounds.top + buttonBounds.height / 2 : undefined,
    });

    animateButton();
    playTapSound();
    navigator.vibrate?.(8);
    setStatus("saving");
    setCampaign((current) => ({
      ...current,
      tapCount: current.tapCount + 1,
      myTapCount: (current.myTapCount ?? 0) + 1,
    }));

    try {
      const response = await fetch("/api/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tapProof: tapProofRef.current }),
      });
      const savedCampaign = await response.json().catch(() => ({}));

      if (response.status === 429) {
        rollbackOptimisticTap();
        const retryAfter = Number(savedCampaign.retryAfter
          ?? response.headers.get("Retry-After")
          ?? 60);

        window.clearTimeout(cooldownTimerRef.current);
        cooldownUntilRef.current = Date.now() + Math.max(1, retryAfter) * 1_000;
        setStatus("limited");
        cooldownTimerRef.current = window.setTimeout(() => {
          cooldownUntilRef.current = 0;
          setStatus("ready");
        }, Math.max(1, retryAfter) * 1_000);
        return;
      }

      if (response.status === 403) {
        rollbackOptimisticTap();
        try {
          const refreshResponse = await fetch("/api/counter");
          if (!refreshResponse.ok) throw new Error("Tap verification refresh failed.");
          const refreshedCampaign = await refreshResponse.json();
          tapProofRef.current = refreshedCampaign.tapProof ?? "";
          setCampaign(refreshedCampaign);
          setStatus("ready");
        } catch {
          setStatus("offline");
        }
        return;
      }

      if (!response.ok) throw new Error("Tap failed.");
      tapProofRef.current = savedCampaign.tapProof ?? tapProofRef.current;
      setCampaign((current) => ({
        ...savedCampaign,
        tapCount: Math.max(current.tapCount, savedCampaign.tapCount),
        myTapCount: Math.max(current.myTapCount ?? 0, savedCampaign.myTapCount ?? 0),
      }));
      if (Date.now() >= cooldownUntilRef.current) setStatus("ready");
    } catch {
      rollbackOptimisticTap();
      if (Date.now() >= cooldownUntilRef.current) setStatus("offline");
    }
  }

  return (
    <main className="app-shell">
      <audio ref={tapAudioRef} preload="auto" src="/assets/tap-pop.wav" />
      <LogoPhysics ref={physicsRef} />
      <header className="site-header">
        <h1 className="site-title">
          <a className="wordmark" href="/" aria-label="ChatGPT Reset home">ChatGPT Reset</a>
        </h1>
        <p id="tap-status" className={`header-status ${status}`} aria-live="polite">
          {status === "offline"
            ? "Couldn’t reach the global counter."
            : status === "limited"
              ? "Too fast — taps paused briefly."
            : `${formatNumber.format(Math.min(resetsEarned, MAX_RESETS))}/${MAX_RESETS} resets earned`}
        </p>
        <p className="countdown" aria-live="polite">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </p>
      </header>

      <section className="reset-stage" aria-label="Reset counter">
        <div className="tap-stat tap-stat-personal">
          <span>My taps</span>
          <strong>{formatNumber.format(myTapCount)}</strong>
        </div>

        <div className="reset-center">
          <div className="reset-control">
            <div
              className="button-progress-ring"
              role="progressbar"
              aria-label="Taps toward the next reset"
              aria-valuemin="0"
              aria-valuemax={RESET_TARGET}
              aria-valuenow={campaign.tapCount % RESET_TARGET}
            >
              <CircularProgressbar
                value={progress}
                strokeWidth={2.2}
                styles={buttonProgressStyles}
              />
            </div>
            <button
              data-testid="reset-button"
              ref={buttonRef}
              className="reset-button"
              type="button"
              onClick={addTap}
              disabled={status === "loading" || status === "limited"}
              aria-describedby="tap-status taps-remaining"
            >
              <span>
                {status === "loading" ? "Loading" : status === "limited" ? "Cooldown" : "Tap for reset"}
              </span>
            </button>
          </div>

          <p id="taps-remaining" className="taps-remaining" aria-live="polite">
            <strong>{formatNumber.format(tapsToNextReset)}</strong>
            <span>(taps for next reset)</span>
          </p>
        </div>

        <div className="tap-stat tap-stat-total">
          <span>Total taps</span>
          <strong>
            {formatNumber.format(campaign.tapCount)}/{formatNumber.format(RESET_TARGET)}
          </strong>
        </div>
      </section>

      <footer className="site-footer">
        <span>Unofficial internet experiment.</span>
        <span>Not affiliated with OpenAI.</span>
      </footer>
    </main>
  );
}
