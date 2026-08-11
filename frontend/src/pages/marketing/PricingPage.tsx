import { useNavigate } from "react-router-dom";
import { MarketingNav } from "../../components/layout/MarketingNav";

const TIERS = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    analyses: "50 video analyses / month",
    highlight: false,
    features: [
      "Up to 3 workstations",
      "Full 7-stage pipeline",
      "Excel report download",
      "Human review gate",
      "Email support",
      "5 GB video storage",
    ],
  },
  {
    name: "Growth",
    price: "$299",
    period: "/month",
    analyses: "200 video analyses / month",
    highlight: true,
    features: [
      "Unlimited workstations",
      "Full 7-stage pipeline",
      "Excel report download",
      "Human review gate",
      "Priority support",
      "25 GB video storage",
      "Cycle time trend dashboard",
      "Side-by-side comparison",
      "User role management",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    analyses: "Unlimited analyses",
    highlight: false,
    features: [
      "Everything in Growth",
      "Dedicated GCP tenancy",
      "SSO / SAML integration",
      "Custom data retention",
      "SLA guarantee",
      "Onboarding & IE training",
      "API access",
      "Volume pricing",
    ],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      <section className="bg-navy pt-32 pb-20 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Pricing</span>
            <span className="inline-block h-px w-6 bg-accent" />
          </div>
          <h1 className="font-display font-extrabold text-[60px] uppercase text-white leading-[0.92] mb-6">
            Simple, usage-based pricing
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Each analysis costs ~$0.04 in cloud infrastructure. Our pricing reflects that — you
            pay for usage, not for a seat count that doesn't reflect how the platform is actually used.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-8 flex flex-col relative ${
                tier.highlight
                  ? "border-accent bg-accent-soft shadow-lg shadow-accent/10"
                  : "border-line bg-raised"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white uppercase tracking-wide">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <div className="font-display font-extrabold text-2xl uppercase text-ink mb-1">{tier.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-5xl text-ink">{tier.price}</span>
                  <span className="text-ink-dim text-sm">{tier.period}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-accent">{tier.analyses}</div>
              </div>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-dim">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent shrink-0">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(tier.name === "Enterprise" ? "/about" : "/login")}
                className={`w-full rounded-md py-3 text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "border border-line text-ink hover:border-accent hover:text-accent"
                }`}
              >
                {tier.name === "Enterprise" ? "Contact sales" : "Get started"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
