"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ironudede0011@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If already authenticated, redirect straight to workspace
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace("/workspace");
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setCheckingAuth(false);
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      // Success -> navigate to workspace
      router.push("/workspace");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf9f5",
          color: "#6b665f",
          fontFamily: "var(--font-sans, Inter, sans-serif)",
          fontSize: "0.95rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "2px solid #cc785c",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Verifying Cadence session...
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#faf9f5",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(204, 120, 92, 0.08) 0%, rgba(250, 249, 245, 0) 65%)",
        padding: "24px",
        fontFamily: "var(--font-sans, Inter, sans-serif)",
        color: "#181715",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#181715",
              color: "#faf9f5",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            C
          </span>
          <span
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
              fontSize: "1.6rem",
              fontWeight: "600",
              letterSpacing: "-0.01em",
              color: "#181715",
            }}
          >
            Cadence
          </span>
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
            fontSize: "2.1rem",
            fontWeight: "500",
            lineHeight: "1.2",
            margin: "0 0 8px 0",
            letterSpacing: "-0.015em",
          }}
        >
          Private Personal Workspace
        </h1>
        <p
          style={{
            margin: 0,
            color: "#6b665f",
            fontSize: "0.95rem",
            maxWidth: "360px",
            lineHeight: "1.5",
          }}
        >
          Sign in to access your MongoDB-synchronized task repository.
        </p>
      </div>

      {/* Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e7e3da",
          boxShadow: "0 4px 24px -4px rgba(24, 23, 21, 0.05), 0 1px 3px rgba(24, 23, 21, 0.03)",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #cc785c 0%, #dd8a6f 100%)",
          }}
        />

        {error && (
          <div
            style={{
              backgroundColor: "rgba(196, 77, 60, 0.08)",
              border: "1px solid rgba(196, 77, 60, 0.25)",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#b43b29",
              fontSize: "0.88rem",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              lineHeight: "1.4",
            }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6b665f",
                marginBottom: "7px",
              }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #d5d0c7",
                backgroundColor: "#fdfdfc",
                fontSize: "0.95rem",
                color: "#181715",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "7px",
              }}
            >
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#6b665f",
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "0.78rem",
                  color: "#cc785c",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your workspace password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #d5d0c7",
                backgroundColor: "#fdfdfc",
                fontSize: "0.95rem",
                color: "#181715",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={loading ? "btn-evaluating" : ""}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "#cc785c",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.96rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s ease, transform 0.1s ease",
              boxShadow: "0 2px 8px rgba(204, 120, 92, 0.25)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                <span>Authenticating session</span>
                <span className="eval-dots"><span>.</span><span>.</span><span>.</span></span>
              </>
            ) : (
              "Sign In to Cadence"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #f0eee8",
            fontSize: "0.78rem",
            color: "#8a857d",
            textAlign: "center",
            lineHeight: "1.5",
          }}
        >
          Secured with NIST-grade salt hashing &amp; MongoDB Atlas persistent database.
        </div>
      </div>

      {/* Return home link */}
      <div style={{ marginTop: "24px" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.85rem",
            color: "#6b665f",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Return to Overview
        </Link>
      </div>
    </div>
  );
}
