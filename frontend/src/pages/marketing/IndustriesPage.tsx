import { MarketingNav } from "../../components/layout/MarketingNav";
import { useNavigate } from "react-router-dom";

const INDUSTRIES = [
  {
    title: "Automotive Assembly",
    img: "/marketing/hero-factory.jpg",
    clients: "ABC Corp, Enterprise Manufacturers",
    scenarios: [
      { station: "Cam Phaser Assembly", tmu: "1,150 TMU", insight: "4% cycle time improvement tracked over Q3 after workstation reorganization" },
      { station: "Press Fit Operation", tmu: "980–1,020 TMU", insight: "Regression detected in September — operator flagged for re-training" },
      { station: "Torque Fastening", tmu: "740 TMU", insight: "Tool Use accounts for 62% of cycle — electric driver upgrade evaluated" },
    ],
  },
  {
    title: "Electronics Manufacturing",
    img: "/marketing/hands-workstation.jpg",
    clients: "XYZ Industries",
    scenarios: [
      { station: "End Effector Sub-Assembly", tmu: "1,580 TMU", insight: "2 flags raised — harness routing classification reviewed by IE" },
      { station: "PCB Component Insertion", tmu: "620 TMU", insight: "Controlled Move dominant — suggests jig redesign opportunity" },
    ],
  },
  {
    title: "Packaging & Kitting",
    img: "/marketing/kitting-station.jpg",
    clients: "Distribution centers, 3PL operators",
    scenarios: [
      { station: "Kitting & Packing", tmu: "640 TMU", insight: "Tool Use at 33% — high for a kitting station; labeler placement evaluated" },
      { station: "Foam Insert Assembly", tmu: "480 TMU", insight: "General Move dominant — ergonomic reach reduction identified as opportunity" },
    ],
  },
];

export function IndustriesPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      <section className="bg-navy pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Industries</span>
          </div>
          <h1 className="font-display font-extrabold text-[60px] uppercase text-white leading-[0.92] mb-6">
            Built for any<br />manual workstation.
          </h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
            If a human is doing a repeatable task at a fixed station, this platform can analyze
            it. Real example data from current deployments below.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl flex flex-col gap-16">
          {INDUSTRIES.map((ind) => (
            <div key={ind.title}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-display font-extrabold text-3xl uppercase text-ink">{ind.title}</h2>
                <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-faint">{ind.clients}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="rounded-xl overflow-hidden aspect-video bg-raised-2 border border-line">
                  <img src={ind.img} alt={ind.title} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex flex-col gap-4">
                  {ind.scenarios.map((s) => (
                    <div key={s.station} className="rounded-lg border border-line bg-raised p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-ink text-sm">{s.station}</span>
                        <span className="font-mono text-xs text-accent">{s.tmu}</span>
                      </div>
                      <p className="text-xs text-ink-dim">{s.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-navy text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display font-extrabold text-4xl uppercase text-white mb-4">
            Don't see your industry?
          </h2>
          <p className="text-white/50 mb-8">BasicMOST applies to any manual assembly or material handling operation. Contact us to discuss your specific use case.</p>
          <button onClick={() => navigate("/about")} className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
            Get in touch →
          </button>
        </div>
      </section>
    </div>
  );
}
