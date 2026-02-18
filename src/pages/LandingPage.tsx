import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface CountryOption {
  code: string;
  label: string;
  currency: "EUR" | "USD" | "GBP";
  symbol: string;
  locale: string;
  multiplier: number;
}

const COUNTRIES: CountryOption[] = [
  { code: "DE", label: "Germany", currency: "EUR", symbol: "\u20AC", locale: "de-DE", multiplier: 1.02 },
  { code: "FR", label: "France", currency: "EUR", symbol: "\u20AC", locale: "fr-FR", multiplier: 1.0 },
  { code: "NL", label: "Netherlands", currency: "EUR", symbol: "\u20AC", locale: "nl-NL", multiplier: 1.03 },
  { code: "ES", label: "Spain", currency: "EUR", symbol: "\u20AC", locale: "es-ES", multiplier: 0.97 },
  { code: "IT", label: "Italy", currency: "EUR", symbol: "\u20AC", locale: "it-IT", multiplier: 0.96 },
  { code: "US", label: "United States", currency: "USD", symbol: "$", locale: "en-US", multiplier: 0.95 },
  { code: "GB", label: "United Kingdom", currency: "GBP", symbol: "\u00A3", locale: "en-GB", multiplier: 0.94 },
];

const TRUST_SIGNALS = [
  { icon: "shield", text: "We never store your emails" },
  { icon: "device", text: "Parsing happens locally" },
  { icon: "lock", text: "No inbox API access" },
  { icon: "pause", text: "Pause anytime" },
];

const FAQ_ITEMS = [
  {
    q: "Do you read my emails?",
    a: "No. We only detect order confirmation patterns inside your logged-in session and extract structured data like price, product name, and order ID. We never see or store the content of your emails.",
  },
  {
    q: "Can you cancel orders without my permission?",
    a: "Absolutely not. Every action that touches your money requires your explicit confirmation. We prepare everything, you press the button.",
  },
  {
    q: "What if the second item arrives but I don\u2019t get refunded for the first?",
    a: "We sequence everything carefully: the new purchase only happens after cancellation is confirmed. We also provide step-by-step safeguards so you\u2019re never stuck with two charges.",
  },
  {
    q: "Is this legal?",
    a: "Yes. All actions happen inside your own authenticated sessions and follow standard retailer return policies. You\u2019re simply exercising your right to return within the allowed window.",
  },
  {
    q: "How much does it cost?",
    a: "Free to start. No credit card required. We only succeed when you save money.",
  },
];

/* ------------------------------------------------------------------ */
/*  Small reusable bits                                                */
/* ------------------------------------------------------------------ */

const TrustIcon: React.FC<{ type: string }> = ({ type }) => {
  const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "shield":
      return <svg {...common}><path d="M10 2l6 3v5c0 4-2.7 6.4-6 8-3.3-1.6-6-4-6-8V5l6-3z" /></svg>;
    case "device":
      return <svg {...common}><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M10 14h.01" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="9" width="10" height="8" rx="2" /><path d="M7 9V6a3 3 0 0 1 6 0v3" /></svg>;
    case "pause":
      return <svg {...common}><rect x="6" y="4" width="3" height="12" rx="1" /><rect x="11" y="4" width="3" height="12" rx="1" /></svg>;
    default:
      return null;
  }
};

const FaqItem: React.FC<{ q: string; a: string; open: boolean; onToggle: () => void }> = ({ q, a, open, onToggle }) => (
  <div className={`lp-faq-item ${open ? "lp-faq-open" : ""}`}>
    <button type="button" className="lp-faq-trigger" onClick={onToggle} aria-expanded={open}>
      <span>{q}</span>
      <svg className="lp-faq-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8l4 4 4-4" />
      </svg>
    </button>
    <div className="lp-faq-body" aria-hidden={!open}>
      <p>{a}</p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const LandingPage: React.FC = () => {
  /* -- Simulator state -- */
  const [orders, setOrders] = useState(4);
  const [avgValue, setAvgValue] = useState(120);
  const [country, setCountry] = useState("DE");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [simAnimated, setSimAnimated] = useState(false);

  const sel = useMemo(() => COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0], [country]);

  const estimate = useMemo(() => {
    const o = Number.isFinite(orders) ? Math.max(1, Math.min(orders, 50)) : 1;
    const v = Number.isFinite(avgValue) ? Math.max(10, Math.min(avgValue, 5000)) : 10;
    return Math.max(48, Math.round(o * 12 * v * 0.037 * sel.multiplier));
  }, [orders, avgValue, sel.multiplier]);

  const fmtEstimate = useMemo(
    () => new Intl.NumberFormat(sel.locale, { style: "currency", currency: sel.currency, maximumFractionDigits: 0 }).format(estimate),
    [estimate, sel],
  );

  const handleSimulate = useCallback(() => setSimAnimated(true), []);

  useEffect(() => {
    if (simAnimated) {
      const t = setTimeout(() => setSimAnimated(false), 600);
      return () => clearTimeout(t);
    }
  }, [simAnimated, estimate]);

  /* -- SEO -- */
  useEffect(() => {
    const prev = document.title;
    document.title = "AfterSave \u2014 Never Overpay After You Buy";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    const prevDesc = meta.getAttribute("content");
    meta.setAttribute("content", "AfterSave monitors your orders after checkout and finds better prices while you can still get a refund. Free to start.");
    return () => { document.title = prev; if (meta) { if (prevDesc) meta.setAttribute("content", prevDesc); else if (created) meta.remove(); else meta.removeAttribute("content"); } };
  }, []);

  /* -- Render -- */
  return (
    <div className="lp">
      {/* ===== HERO ===== */}
      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-inner">
          <p className="lp-hero-badge">Post-purchase price protection</p>
          <h1 className="lp-hero-h1">
            Bought something online?<br />
            <span className="lp-hero-gradient">We make sure you got the best price.</span>
          </h1>
          <p className="lp-hero-sub">
            AfterSave watches your orders after checkout. If the price drops while you can still cancel, we help you swap and pocket the difference.
          </p>
          <div className="lp-hero-cta-row">
            <Link to="/auth" className="lp-btn lp-btn-primary lp-btn-lg">
              Start Saving Now &mdash; It&rsquo;s Free
            </Link>
            <a href="#how-it-works" className="lp-btn lp-btn-ghost lp-btn-lg">
              See How It Works
            </a>
          </div>
          <ul className="lp-trust-row">
            {TRUST_SIGNALS.map((t) => (
              <li key={t.icon}>
                <TrustIcon type={t.icon} />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== LIVE EXAMPLE ===== */}
      <section className="lp-section" id="live-example">
        <div className="lp-example-wrapper">
          <div className="lp-example-left">
            <span className="lp-label">Real scenario</span>
            <h2 className="lp-h2">See AfterSave in action</h2>
            <p className="lp-body">You buy a Dyson V15 for <strong>&euro;599</strong>. Two hours later, an authorized seller lists the exact same product for <strong>&euro;499</strong>.</p>
            <p className="lp-body">AfterSave catches it instantly and shows you what to do next.</p>
          </div>
          <div className="lp-example-card" aria-label="Example notification">
            <div className="lp-notif-header">
              <div className="lp-notif-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#3B82F6" /><path d="M7 11.5l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="lp-notif-badge">New alert</span>
            </div>
            <p className="lp-notif-title">Price drop detected</p>
            <p className="lp-notif-product">Dyson V15 Detect Absolute</p>
            <div className="lp-notif-prices">
              <div>
                <span className="lp-notif-label">You paid</span>
                <span className="lp-notif-old">&euro;599</span>
              </div>
              <div className="lp-notif-arrow">&rarr;</div>
              <div>
                <span className="lp-notif-label">Available now</span>
                <span className="lp-notif-new">&euro;499</span>
              </div>
            </div>
            <div className="lp-notif-savings">
              <strong>Save &euro;100</strong>
              <span>22 hours left to cancel</span>
            </div>
            <Link to="/auth" className="lp-btn lp-btn-primary lp-notif-btn">
              Swap &amp; Save &euro;100
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-section" id="how-it-works">
        <span className="lp-label lp-label-center">How it works</span>
        <h2 className="lp-h2 lp-text-center">Three steps. Zero effort.</h2>
        <p className="lp-body lp-text-center lp-mw-prose">You keep shopping the way you always do. AfterSave works quietly in the background.</p>
        <div className="lp-steps">
          <article className="lp-step">
            <div className="lp-step-num">1</div>
            <h3>You buy something</h3>
            <p>AfterSave detects order confirmations from your email session. No forwarding, no API access to your inbox.</p>
          </article>
          <div className="lp-step-connector" aria-hidden="true" />
          <article className="lp-step">
            <div className="lp-step-num">2</div>
            <h3>We keep shopping</h3>
            <p>While your return window is open, we scan for the same product at a lower price across authorized sellers.</p>
          </article>
          <div className="lp-step-connector" aria-hidden="true" />
          <article className="lp-step">
            <div className="lp-step-num">3</div>
            <h3>You pocket the difference</h3>
            <p>Found a better deal? We prepare everything. You confirm the swap, we handle the rest. No double charges, no risk.</p>
          </article>
        </div>
      </section>

      {/* ===== SIMULATOR ===== */}
      <section className="lp-section lp-sim-section" id="savings-simulator">
        <div className="lp-sim-wrapper">
          <div className="lp-sim-copy">
            <span className="lp-label">Free savings calculator</span>
            <h2 className="lp-h2">See what <em>you</em> could save — in seconds</h2>
            <p className="lp-body">Answer three quick questions and get an instant, conservative estimate of your annual savings. No signup required.</p>
            <div className="lp-sim-trust">
              {TRUST_SIGNALS.map((t) => (
                <div key={t.icon} className="lp-sim-trust-item">
                  <TrustIcon type={t.icon} />
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-sim-card">
            <div className="lp-sim-field">
              <label htmlFor="sim-orders">Online orders per month</label>
              <input id="sim-orders" type="range" min={1} max={30} value={orders} onChange={(e) => { setOrders(Number(e.target.value)); handleSimulate(); }} />
              <output>{orders}</output>
            </div>
            <div className="lp-sim-field">
              <label htmlFor="sim-value">Average order value ({sel.symbol})</label>
              <input id="sim-value" type="range" min={20} max={1000} step={10} value={avgValue} onChange={(e) => { setAvgValue(Number(e.target.value)); handleSimulate(); }} />
              <output>{sel.symbol}{avgValue}</output>
            </div>
            <div className="lp-sim-field">
              <label htmlFor="sim-country">Country</label>
              <select id="sim-country" value={country} onChange={(e) => { setCountry(e.target.value); handleSimulate(); }}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className={`lp-sim-result ${simAnimated ? "lp-sim-pop" : ""}`} role="status" aria-live="polite">
              <span className="lp-sim-result-label">Your estimated annual savings</span>
              <span className="lp-sim-result-value">{fmtEstimate}</span>
              <span className="lp-sim-result-note">Conservative estimate based on monitored return windows</span>
            </div>
            <Link to="/auth" className="lp-btn lp-btn-primary lp-btn-block">
              Start Saving &mdash; It&rsquo;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MODES ===== */}
      <section className="lp-section" id="product-modes">
        <span className="lp-label lp-label-center">Choose your level of control</span>
        <h2 className="lp-h2 lp-text-center">You decide how hands-on you want to be</h2>
        <div className="lp-modes">
          <article className="lp-mode">
            <div className="lp-mode-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21h20M4 14h20M4 7h20" /></svg>
            </div>
            <h3>Manual</h3>
            <p>We find the deal and show you exactly what to do. You handle the swap yourself.</p>
          </article>
          <article className="lp-mode lp-mode-popular">
            <div className="lp-mode-badge">Most popular</div>
            <div className="lp-mode-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10l6 4" /><circle cx="14" cy="14" r="10" /></svg>
            </div>
            <h3>Assisted</h3>
            <p>We prepare checkout and cancellation forms. You confirm the final step with one click.</p>
          </article>
          <article className="lp-mode lp-mode-future">
            <div className="lp-mode-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 14l4 4 10-10" /></svg>
            </div>
            <h3>Always Save <span className="lp-mode-tag">Coming soon</span></h3>
            <p>Set a savings threshold. When we find a deal that exceeds it, we swap automatically.</p>
          </article>
        </div>
      </section>

      {/* ===== TRUST / SECURITY ===== */}
      <section className="lp-section lp-security" id="trust-security">
        <span className="lp-label lp-label-center">Privacy &amp; security</span>
        <h2 className="lp-h2 lp-text-center">Built for people who care about their data</h2>
        <div className="lp-security-grid">
          <div className="lp-sec-item">
            <TrustIcon type="device" />
            <div>
              <h4>Local parsing</h4>
              <p>Order data is extracted on your device. Nothing leaves your browser unless you say so.</p>
            </div>
          </div>
          <div className="lp-sec-item">
            <TrustIcon type="shield" />
            <div>
              <h4>No email content stored</h4>
              <p>We extract price, product, and order ID. The rest of your inbox stays private.</p>
            </div>
          </div>
          <div className="lp-sec-item">
            <TrustIcon type="lock" />
            <div>
              <h4>No inbox API access</h4>
              <p>We never request OAuth access to Gmail, Outlook, or any mail provider.</p>
            </div>
          </div>
          <div className="lp-sec-item">
            <TrustIcon type="pause" />
            <div>
              <h4>Full audit log</h4>
              <p>Every action is logged. Pause or stop monitoring at any time with one click.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="lp-section" id="social-proof">
        <div className="lp-stats-bar">
          <div className="lp-stat">
            <strong>&euro;84,200+</strong>
            <span>Savings generated</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <strong>12,430</strong>
            <span>Return windows monitored</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <strong>3h 18m</strong>
            <span>Average time to first alert</span>
          </div>
        </div>
      </section>

      {/* ===== REFERRAL ===== */}
      <section className="lp-section" id="referral">
        <div className="lp-referral">
          <div>
            <h2 className="lp-h2">Save together. Earn together.</h2>
            <p className="lp-body">Invite friends and earn a percentage of the savings we generate for them in their first 90 days.</p>
          </div>
          <Link to="/auth" className="lp-btn lp-btn-primary lp-btn-lg">
            Invite Friends
          </Link>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-section" id="faq">
        <span className="lp-label lp-label-center">Questions?</span>
        <h2 className="lp-h2 lp-text-center">Frequently asked questions</h2>
        <div className="lp-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
          ))}
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="lp-final">
        <div className="lp-final-glow" aria-hidden="true" />
        <h2>Stop losing money after checkout.</h2>
        <p>Free to start. No credit card. Cancel anytime.</p>
        <Link to="/auth" className="lp-btn lp-btn-primary lp-btn-lg">
          Start Saving Now
        </Link>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#2563EB" /><text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui">AS</text></svg>
          <span>AfterSave</span>
        </div>
        <div className="lp-footer-links">
          <a href="#trust-security">Security</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#faq">FAQ</a>
          <a href="mailto:hello@aftersave.com">Contact</a>
        </div>
      </footer>
    </div>
  );
};
