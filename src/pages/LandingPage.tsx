import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

interface CountryOption {
  code: string;
  label: string;
  currency: "EUR" | "USD" | "GBP";
  locale: string;
  multiplier: number;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "DE", label: "Germany", currency: "EUR", locale: "de-DE", multiplier: 1.02 },
  { code: "FR", label: "France", currency: "EUR", locale: "fr-FR", multiplier: 1.0 },
  { code: "NL", label: "Netherlands", currency: "EUR", locale: "nl-NL", multiplier: 1.03 },
  { code: "ES", label: "Spain", currency: "EUR", locale: "es-ES", multiplier: 0.97 },
  { code: "IT", label: "Italy", currency: "EUR", locale: "it-IT", multiplier: 0.96 },
  { code: "US", label: "United States", currency: "USD", locale: "en-US", multiplier: 0.95 },
  { code: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB", multiplier: 0.94 }
];

const TRUST_POINTS = [
  "We never store your emails.",
  "Parsing happens locally.",
  "No inbox API access.",
  "You can pause anytime."
];

export const LandingPage: React.FC = () => {
  const [ordersPerMonth, setOrdersPerMonth] = useState<number>(4);
  const [averageOrderValue, setAverageOrderValue] = useState<number>(120);
  const [countryCode, setCountryCode] = useState<string>("DE");

  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find((option) => option.code === countryCode) ??
      COUNTRY_OPTIONS[0],
    [countryCode]
  );

  const annualSavingsEstimate = useMemo(() => {
    const safeOrders = Number.isFinite(ordersPerMonth)
      ? Math.min(Math.max(ordersPerMonth, 1), 50)
      : 1;
    const safeOrderValue = Number.isFinite(averageOrderValue)
      ? Math.min(Math.max(averageOrderValue, 10), 5000)
      : 10;
    const annualSpend = safeOrders * 12 * safeOrderValue;
    const conservativeCaptureRate = 0.037;
    const estimate = annualSpend * conservativeCaptureRate * selectedCountry.multiplier;
    return Math.max(48, Math.round(estimate));
  }, [averageOrderValue, ordersPerMonth, selectedCountry.multiplier]);

  const estimateLabel = useMemo(
    () =>
      new Intl.NumberFormat(selectedCountry.locale, {
        style: "currency",
        currency: selectedCountry.currency,
        maximumFractionDigits: 0
      }).format(annualSavingsEstimate),
    [annualSavingsEstimate, selectedCountry]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "AfterSave - Never Overpay After You Buy";

    let descriptionTag = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    const createdTag = !descriptionTag;
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }

    const previousDescription = descriptionTag.getAttribute("content");
    descriptionTag.setAttribute(
      "content",
      "AfterSave monitors order confirmations and keeps shopping while returns are still possible so you can swap safely when better prices appear."
    );

    return () => {
      document.title = previousTitle;
      if (descriptionTag) {
        if (previousDescription) {
          descriptionTag.setAttribute("content", previousDescription);
        } else if (createdTag) {
          descriptionTag.remove();
        } else {
          descriptionTag.removeAttribute("content");
        }
      }
    };
  }, []);

  return (
    <main className="lp-page">
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-left">
          <p className="lp-kicker">POST-PURCHASE INSURANCE</p>
          <h1>Buy now. If the price drops tomorrow, we help you keep the difference.</h1>
          <p className="lp-lead">
            Most tools stop at checkout. AfterSave keeps protecting your order
            until your return window ends.
          </p>
          <div className="lp-cta-row">
            <Link to="/app" className="lp-btn lp-btn-primary">
              Start Saving Now
            </Link>
            <a href="#lp-how" className="lp-btn lp-btn-ghost">
              See How It Works
            </a>
          </div>
          <div className="lp-trust-row" aria-label="trust signals">
            {TRUST_POINTS.map((point) => (
              <span key={point} className="lp-trust-chip">
                {point}
              </span>
            ))}
          </div>
        </div>

        <aside id="savings-simulator" className="lp-sim">
          <p className="lp-sim-kicker">DOPAMINE PREVIEW</p>
          <h2>See your likely yearly savings in 10 seconds.</h2>

          <label htmlFor="orders-per-month">Roughly how many online orders per month?</label>
          <input
            id="orders-per-month"
            type="number"
            min={1}
            max={50}
            value={ordersPerMonth}
            onChange={(event) => setOrdersPerMonth(Number(event.target.value))}
          />

          <label htmlFor="average-order-value">Average order value?</label>
          <input
            id="average-order-value"
            type="number"
            min={10}
            max={5000}
            value={averageOrderValue}
            onChange={(event) => setAverageOrderValue(Number(event.target.value))}
          />

          <label htmlFor="country">Country?</label>
          <select
            id="country"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="lp-sim-result" role="status" aria-live="polite">
            <strong>People like you save {estimateLabel}/year on average.</strong>
            <small>Conservative projection. Real savings may be higher.</small>
          </div>

          <Link to="/app" className="lp-btn lp-btn-primary lp-sim-cta">
            Get My Savings Plan
          </Link>
        </aside>
      </section>

      <section className="lp-band">
        <p>
          You are not buying software. You are buying confidence after checkout.
        </p>
      </section>

      <section className="lp-section" id="lp-problem">
        <h2>The most expensive moment in ecommerce is after you pay.</h2>
        <p>
          Prices still move. Refund policies are inconsistent. You either lose
          money or spend time manually canceling and re-buying.
        </p>
        <div className="lp-timeline">
          <span>Search</span>
          <span>Buy</span>
          <span className="lp-deadzone">Dead Zone</span>
          <span>Delivery</span>
        </div>
      </section>

      <section className="lp-section" id="lp-how">
        <h2>How AfterSave protects your order</h2>
        <div className="lp-steps">
          <article>
            <h3>1. Detect</h3>
            <p>We detect order confirmations in your logged-in session.</p>
          </article>
          <article>
            <h3>2. Compare</h3>
            <p>We search for identical items while cancellation is still possible.</p>
          </article>
          <article>
            <h3>3. Swap Safely</h3>
            <p>No irreversible action happens without your explicit confirmation.</p>
          </article>
        </div>
      </section>

      <section className="lp-section">
        <h2>Real example</h2>
        <div className="lp-example">
          <p>
            Bought: <strong>Dyson Vacuum - EUR 599</strong>
          </p>
          <p>
            2 hours later: <strong>EUR 499</strong> from an authorized seller
          </p>
          <p className="lp-alert">AfterSave alert: Save EUR 100. 22 hours left to cancel.</p>
          <Link to="/app" className="lp-btn lp-btn-ghost">
            Try It On Your Next Order
          </Link>
        </div>
      </section>

      <section className="lp-section lp-proof">
        <div>
          <span>Savings generated</span>
          <strong>EUR 84,200+</strong>
        </div>
        <div>
          <span>Windows monitored</span>
          <strong>12,430</strong>
        </div>
        <div>
          <span>Average alert speed</span>
          <strong>3h 18m</strong>
        </div>
      </section>

      <section className="lp-section">
        <h2>FAQ</h2>
        <div className="lp-faq">
          <article>
            <h3>Do you read my emails?</h3>
            <p>
              We only monitor order confirmations in your authenticated session
              and extract structured purchase data.
            </p>
          </article>
          <article>
            <h3>Can you cancel orders without my permission?</h3>
            <p>No. Every irreversible action requires your explicit confirmation.</p>
          </article>
          <article>
            <h3>What if the refund does not go through?</h3>
            <p>We use safeguard sequencing to reduce double-purchase risk.</p>
          </article>
          <article>
            <h3>Is this legal?</h3>
            <p>Yes. Actions happen inside your own authenticated sessions.</p>
          </article>
        </div>
      </section>

      <section className="lp-final">
        <h2>Stop losing money after checkout.</h2>
        <p>Free to start. No credit card required.</p>
        <Link to="/app" className="lp-btn lp-btn-primary">
          Start Saving Now
        </Link>
      </section>

      <footer className="lp-footer">
        <a href="#lp-how">How It Works</a>
        <a href="#savings-simulator">Savings Projection</a>
        <a href="#lp-problem">Why AfterSave</a>
        <a href="mailto:hello@aftersave.com">Contact</a>
      </footer>
    </main>
  );
};
