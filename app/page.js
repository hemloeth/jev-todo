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
            <div className="hero-eyebrow-container">
              <span className="hero-eyebrow-pulse" />
              <span className="hero-eyebrow-text">Personal Workspace</span>
              <span className="hero-eyebrow-divider">•</span>
              <span className="hero-eyebrow-sub">Solo Focus &amp; Flow</span>
            </div>

            <h1 className="hero-display-headline">
              Meet your thinking partner for <em>daily action.</em>
            </h1>

            <p className="hero-subheadline">
              Paste scratchpads, quick thoughts, or half-formed notes. Cadence organizes tasks, deadlines, and priorities with calm clarity.
            </p>

            {/* RESPONSIVE CTA BUTTONS (Full-width on mobile, side-by-side on desktop) */}
            <div className="hero-cta-group">
              <Link href="/workspace" className="hero-btn-primary">
                <span>Open Workspace</span>
                <span style={{ fontSize: "17px" }}>→</span>
              </Link>

              <Link href="/workspace?demo=true" className="hero-btn-secondary">
                <span>Paste Notes...</span>
              </Link>
            </div>

            {/* Quick Metrics Strip */}
            <div className="hero-metrics-strip">
              <div className="hero-metric-chip">
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-primary)" }} />
                <span>Active Tasks:</span>
                <strong>{taskMetrics.active}</strong>
              </div>
              <div className="hero-metric-chip">
                <span style={{ color: "var(--color-success)", fontWeight: "bold" }}>✓</span>
                <span>Completed:</span>
                <strong style={{ color: "var(--color-success)" }}>{taskMetrics.completed}</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Tangible Product Showcase Card */}
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
                  cadence.preview
                </span>
              </div>
              <span style={{ color: "var(--color-accent-teal)", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-accent-teal)" }} />
                active
              </span>
            </div>

            {/* Visual transformation: Raw text -> Tangible, Beautiful Action Card */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              {/* 1. Raw Scratchpad Thought */}
              <div
                style={{
                  backgroundColor: "var(--color-surface-dark-soft)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  border: "1px solid rgba(230, 223, 216, 0.08)",
                  fontSize: "13px",
                  color: "var(--color-on-dark)",
                }}
              >
                <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-muted-soft)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>📝</span>
                  <span>Unstructured Scratchpad Note</span>
                </div>
                <div style={{ fontStyle: "italic", color: "#e8e5de", lineHeight: 1.45, fontSize: "13.5px" }}>
                  &ldquo;Prepare presentation deck for quarterly review by Friday&rdquo;
                </div>
              </div>

              {/* Conversion flow separator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", fontSize: "12px", gap: "6px", padding: "2px 0" }}>
                <span style={{ fontSize: "14px" }}>↓</span>
                <span style={{ fontWeight: 500, letterSpacing: "0.2px" }}>Instant Task Transformation</span>
              </div>

              {/* 2. Tangible Actionable Task Card */}
              <div
                style={{
                  backgroundColor: "var(--color-surface-dark-elevated)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  border: "1px solid rgba(204, 120, 92, 0.3)",
                  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "2px solid var(--color-primary)",
                      marginTop: "2px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", lineHeight: 1.35 }}>
                      Prepare presentation deck for quarterly review
                    </div>
                  </div>
                </div>

                {/* Metadata Chips: Priority, Deadline, Status */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "2px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(204, 120, 92, 0.22)",
                      color: "#e8947b",
                      border: "1px solid rgba(204, 120, 92, 0.3)",
                    }}
                  >
                    ● Urgent Priority
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "var(--color-on-dark-soft)",
                    }}
                  >
                    📅 Friday (Sep 25)
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(46, 117, 89, 0.18)",
                      color: "#4ade80",
                    }}
                  >
                    ⚡ Active Focus
                  </span>
                </div>
              </div>

              {/* Direct Workspace Action Link */}
              <Link
                href="/workspace"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  marginTop: "4px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(204, 120, 92, 0.18)",
                  color: "var(--color-primary)",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                  border: "1px solid rgba(204, 120, 92, 0.25)",
                }}
              >
                <span>Launch Interactive Workspace</span>
                <span>→</span>
              </Link>
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
        Cadence — Humanist Personal Task Space
      </footer>
    </div>
  );
}
