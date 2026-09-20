"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [taskMetrics, setTaskMetrics] = useState({ active: 3, completed: 1 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cadence_personal_tasks_v1");
      if (saved) {
        const tasks = JSON.parse(saved);
        setTaskMetrics({
          active: tasks.filter((t) => !t.completed).length,
          completed: tasks.filter((t) => t.completed).length,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="claude-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 1. TOP NAV */}
      <header className="claude-nav">
        <div className="claude-nav-content">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
            {/* Cadence Minimalist SVG Monogram */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0, display: "block" }}
              aria-label="Cadence Logo"
            >
              {/* Open geometric C arc representing natural task flow */}
              <path
                d="M 18 6.5 A 8.5 8.5 0 1 0 18 17.5"
                stroke="var(--color-ink)"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              {/* Focal pulse node in signature warm coral */}
              <circle cx="12" cy="12" r="2.75" fill="var(--color-primary)" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "22px",
                fontWeight: 500,
                color: "var(--color-ink)",
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              Cadence
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/login"
              style={{
                fontSize: "13px",
                color: "var(--color-muted)",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-hairline)",
                backgroundColor: "var(--color-surface-soft)",
              }}
            >
              Sign In
            </Link>

            <Link
              href="/workspace"
              className="btn-primary"
              style={{
                height: "34px",
                padding: "0 14px",
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span>Workspace</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ONE-PAGER HERO SECTION */}
      <main
        className="claude-container"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "16px",
          paddingBottom: "32px",
        }}
      >
        <section className="hero-band-grid">
          {/* Left Column: Headline, subtext, actions & metrics */}
          <div className="hero-content-left">
            {/* Minimalist Editorial Eyebrow */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", width: "fit-content" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--color-ink)",
                  letterSpacing: "0.2px",
                }}
              >
                Personal Workspace
              </span>
              <span style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}>
                Solo Focus &amp; Flow
              </span>
            </div>

            <h1
              className="display-headline"
              style={{ fontSize: "clamp(34px, 4.5vw, 50px)", lineHeight: 1.12 }}
            >
              Meet your thinking partner for{" "}
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--color-primary)",
                }}
              >
                daily action.
              </span>
            </h1>

            <p className="sub-headline">
              Paste messy scratchpads, quick thoughts, or half-formed notes. TypeSafe Jev evaluates urgency, deadlines, and task viability with calibrated probabilities — stored securely in your MongoDB cloud database.
            </p>

            {/* CLICKABLE CTA BUTTONS */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingTop: "6px" }}>
              <Link
                href="/workspace"
                className="btn-primary"
                style={{
                  height: "46px",
                  padding: "0 26px",
                  fontSize: "15px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 500,
                  boxShadow: "0 4px 14px rgba(204, 120, 92, 0.28)",
                }}
              >
                <span>Open Workspace</span>
                <span style={{ fontSize: "17px" }}>→</span>
              </Link>

              <Link
                href="/workspace?demo=true"
                className="btn-secondary"
                style={{
                  height: "46px",
                  padding: "0 20px",
                  fontSize: "14px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span>✦ Paste Messy Notes...</span>
              </Link>
            </div>

            {/* Quick Metrics Strip */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "8px" }}>
              <div className="metric-pill">
                <span style={{ color: "var(--color-muted)" }}>Active Tasks:</span>
                <strong>{taskMetrics.active}</strong>
              </div>
              <div className="metric-pill">
                <span style={{ color: "var(--color-muted)" }}>Completed:</span>
                <strong style={{ color: "var(--color-success)" }}>{taskMetrics.completed}</strong>
              </div>
              <div className="metric-pill">
                <span style={{ color: "var(--color-muted)" }}>Storage:</span>
                <strong style={{ color: "#2e7559" }}>MongoDB Atlas</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Dark Product Chrome Showcase Card */}
          <div className="hero-card-right">
            {/* Window chrome header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid rgba(230, 223, 216, 0.12)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#27c93f" }} />
                <span style={{ color: "var(--color-on-dark-soft)", marginLeft: "6px" }}>
                  pipeline: system_one
                </span>
              </div>
              <span style={{ color: "var(--color-accent-teal)" }}>
                latency: 60ms
              </span>
            </div>

            {/* Visual transformation: Raw text -> Calibrated judgment */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              {/* 1. Raw Input snippet */}
              <div
                style={{
                  backgroundColor: "var(--color-surface-dark-soft)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  border: "1px solid rgba(230, 223, 216, 0.08)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-on-dark-soft)",
                }}
              >
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-muted-soft)", marginBottom: "4px" }}>
                  Raw Note Input
                </div>
                <div style={{ color: "var(--color-on-dark)" }}>
                  &quot;Prepare presentation for quarterly review by Friday&quot;
                </div>
              </div>

              {/* Arrow connector */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", fontSize: "11px", gap: "4px" }}>
                <span>↓ Jev Calibrated Evaluation</span>
              </div>

              {/* 2. Calibrated Decision items */}
              <div
                style={{
                  backgroundColor: "var(--color-surface-dark-elevated)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--color-on-dark-soft)" }}>priority (score)</span>
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Urgent (2.85)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--color-on-dark-soft)" }}>deadline (choice)</span>
                  <span style={{ color: "var(--color-on-dark)" }}>2026-09-25 ✓</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--color-on-dark-soft)" }}>mode (execution)</span>
                  <span style={{ color: "#2e7559" }}>Solo Direct Action</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--color-on-dark-soft)" }}>is_task (actionability)</span>
                  <span style={{ color: "var(--color-success)" }}>0.95 (True)</span>
                </div>
              </div>

              {/* Direct Clickable Links */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <Link
                  href="/workspace"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(204, 120, 92, 0.15)",
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 500,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <span>Launch Interactive Workspace</span>
                  <span>→</span>
                </Link>

                <Link
                  href="/workspace?tab=basis"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    padding: "6px",
                    color: "var(--color-on-dark-soft)",
                    textDecoration: "none",
                    fontSize: "11px",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span>⚖ On what basis does Jev evaluate? Learn more</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 3. MINIMALIST ONE-PAGER FOOTER NOTE */}
      <footer
        style={{
          marginTop: "auto",
          padding: "20px 24px 28px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--color-muted)",
          borderTop: "1px solid var(--color-hairline)",
          backgroundColor: "var(--color-canvas)",
        }}
      >
        Powered by TypeSafe AI Jev model. Synchronized with MongoDB.
      </footer>
    </div>
  );
}
