import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { instantDb } from "../auth/instantClient";
import { useInstantAuth } from "../auth/useInstantAuth";

/* ------------------------------------------------------------------ */
/*  Auth Landing Page                                                  */
/* ------------------------------------------------------------------ */

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isRegistering, error: authError } = useInstantAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* SEO */
  useEffect(() => {
    const prev = document.title;
    document.title = "AfterSave — Sign in with magic link";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (user && !isRegistering) {
      navigate("/app", { replace: true });
    }
  }, [isRegistering, navigate, user]);

  const sendMagicLink = async () => {
    setSubmitError(null);
    setStatusMessage(null);

    if (!email.trim()) {
      setSubmitError("Please enter your email.");
      return;
    }

    try {
      setIsSending(true);
      await instantDb.auth.sendMagicCode({ email: email.trim().toLowerCase() });
      setCodeSent(true);
      setStatusMessage("Magic code sent. Check your inbox and paste the code below.");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not send magic code. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setStatusMessage(null);

    if (!email.trim() || !code.trim()) {
      setSubmitError("Enter both your email and magic code.");
      return;
    }

    try {
      setIsVerifying(true);
      await instantDb.auth.signInWithMagicCode({
        email: email.trim().toLowerCase(),
        code: code.trim()
      });
      setStatusMessage("Success! Finishing sign-in...");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Invalid or expired code. Please request a new one."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel — brand & value prop */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#2563EB" />
              <text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">AS</text>
            </svg>
            <span className="auth-brand-name">AfterSave</span>
          </div>

          <h1 className="auth-left-heading">
            Stop overpaying<br />
            <span className="auth-left-accent">after</span> you buy.
          </h1>
          <p className="auth-left-desc">
            AfterSave watches your orders after checkout. If the price drops while you can still get a refund, we help you swap and save.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2l6 3v5c0 4-2.7 6.4-6 8-3.3-1.6-6-4-6-8V5l6-3z" />
                </svg>
              </div>
              <div>
                <strong>Private by design</strong>
                <span>We never store your emails or access your inbox</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 6v4l2.5 2.5" />
                </svg>
              </div>
              <div>
                <strong>Automatic monitoring</strong>
                <span>We track prices during your return window</span>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 10l3 3 7-7" />
                </svg>
              </div>
              <div>
                <strong>You stay in control</strong>
                <span>Every swap requires your explicit confirmation</span>
              </div>
            </div>
          </div>

          <div className="auth-social-proof">
            <div className="auth-avatars">
              <div className="auth-avatar" style={{ background: "#3B82F6" }}>J</div>
              <div className="auth-avatar" style={{ background: "#8B5CF6" }}>M</div>
              <div className="auth-avatar" style={{ background: "#EC4899" }}>S</div>
              <div className="auth-avatar" style={{ background: "#10B981" }}>A</div>
            </div>
            <span className="auth-social-text">
              Join <strong>2,400+</strong> people saving money on their purchases
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="auth-right">
        <div className="auth-form-wrapper">
          <Link to="/" className="auth-back-home">
            ← Back to home
          </Link>
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign in with magic link</h2>
            <p className="auth-form-subtitle">
              Enter your email. We&rsquo;ll send a one-time code to sign you in securely.
            </p>
          </div>
          <form className="auth-form" onSubmit={codeSent ? handleVerifyCode : handleSendMagicLink}>
            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {codeSent && (
              <div className="auth-field">
                <label htmlFor="auth-code">Magic code</label>
                <input
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {statusMessage && <p className="auth-success-text">{statusMessage}</p>}
            {(submitError || authError) && (
              <p className="auth-error-text">{submitError || authError}</p>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || isRegistering || isSending || isVerifying}
            >
              {isLoading || isRegistering
                ? "Loading..."
                : codeSent
                ? isVerifying
                  ? "Verifying..."
                  : "Verify code"
                : isSending
                ? "Sending..."
                : "Send magic link"}
            </button>

            {codeSent && (
              <button
                type="button"
                className="auth-secondary-btn"
                onClick={() => {
                  setCode("");
                  void sendMagicLink();
                }}
                disabled={isSending || isVerifying}
              >
                Resend code
              </button>
            )}
          </form>

          <p className="auth-terms">
            By continuing, you agree to our <a href="#terms">Terms of Service</a> and{" "}
            <a href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
