import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav } from "../../components/layout/MarketingNav";

const STEPS = [
  { num: "01", label: "Upload Video", desc: "Drop a short clip of any work cycle. Supports up to 512 MB. Secure and encrypted." },
  { num: "02", label: "Privacy Blur", desc: "Faces are automatically blurred before any AI processing — mandatory, not optional." },
  { num: "03", label: "AI Time & Motion Analysis", desc: "AI Vision model analyses operator motions frame-by-frame, identifying each elemental activity automatically." },
  { num: "04", label: "Elemental Wise Detailed Analysis", desc: "Every motion element is broken down with timing, PMTS classification, and structured work content." },
  { num: "05", label: "MUDA Analysis", desc: "Non-value-add, semi-value-add, and waste activities are automatically identified and quantified." },
  { num: "06", label: "AS IS Final Report", desc: "A complete PMTS time study report is generated — ready for engineering review and sign-off." },
  { num: "07", label: "Potential Recommendations", desc: "AI recommends targeted improvements: bottleneck elimination, waste reduction, and equipment upgrades." },
];

const STATS = [
  { value: "~5 min", label: "per 1-min video", sub: "vs. 30–60 min manual" },
  { value: "~$0.04", label: "per study", sub: "vs. $150–300 manual" },
  { value: "PMTS", label: "methodology", sub: "Predetermined Motion Time System" },
  { value: "100%", label: "face privacy", sub: "blurred before any AI call" },
];

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-end bg-navy overflow-hidden">
        {/* Background image */}
        <img
          src="/marketing/hero-factory.jpg"
          alt="Factory floor"
          className="absolute inset-0 w-full h-full object-cover opacity-35 select-none pointer-events-none"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" />
        {/* Grid line texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

        <div className="relative z-10 w-full mx-auto max-w-7xl px-6 pb-20 pt-36">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fade} className="flex items-center gap-2 mb-5">
              <span className="inline-block h-px w-8 bg-accent" />
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                Automated PMTS Studies · Video In, Report Out
              </span>
            </motion.div>

            <motion.h1
              variants={fade}
              className="font-display font-extrabold uppercase text-white leading-[0.92] text-[clamp(48px,8vw,100px)] mb-6 max-w-4xl"
            >
              Every motion,<br />
              <span className="text-accent">measured.</span><br />
              Automatically.
            </motion.h1>

            <motion.p variants={fade} className="text-white/60 text-lg max-w-xl mb-10 leading-relaxed">
              Upload a factory video. Get a complete PMTS time study in minutes —
              not the hours it takes a trained industrial engineer with a stopwatch.
            </motion.p>

            <motion.div variants={fade} className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/login")}
                className="rounded-md bg-accent px-7 py-3.5 text-base font-semibold text-white hover:bg-accent/90 transition-colors"
              >
                Start free trial
              </button>
              <button
                onClick={() => navigate("/how-it-works")}
                className="rounded-md border border-white/20 px-7 py-3.5 text-base font-semibold text-white hover:border-white/50 transition-colors"
              >
                See how it works →
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <section className="bg-navy-mid border-y border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display font-extrabold text-3xl text-accent uppercase">{s.value}</div>
              <div className="text-sm font-semibold text-white mt-0.5">{s.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7-step workflow ─────────────────────────────────────────── */}
      <section className="py-24 bg-raised">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-14">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block h-px w-6 bg-accent" />
              <span className="font-mono text-xs uppercase tracking-widest text-accent">The pipeline</span>
            </div>
            <h2 className="font-display font-extrabold text-[42px] uppercase text-ink leading-tight">
              Video in. PMTS study out.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="relative p-4 rounded-xl border border-line bg-raised-2 hover:border-accent/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-2xl font-black text-accent/30 group-hover:text-accent/60 transition-colors">
                      {step.num}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className="hidden xl:inline-block text-ink-faint/30 font-mono text-xs font-bold">
                        →
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wide text-ink mb-2 leading-snug break-words">
                    {step.label}
                  </h3>
                  <p className="text-[11.5px] text-ink-dim leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Factory image + callout ──────────────────────────────────── */}
      <section className="grid md:grid-cols-2 min-h-[500px]">
        <div className="relative bg-navy overflow-hidden min-h-[300px]">
          <img
            src="/marketing/hands-workstation.jpg"
            alt="Worker at assembly workstation"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-navy/80" />
        </div>
        <div className="bg-navy flex flex-col justify-center px-12 py-16">
          <span className="font-mono text-xs uppercase tracking-widest text-accent mb-4">Why it matters</span>
          <h2 className="font-display font-extrabold text-4xl uppercase text-white leading-tight mb-6">
            PMTS studies shouldn't<br />require a stopwatch.
          </h2>
          <p className="text-white/60 leading-relaxed mb-8">
            Predetermined Motion Time Systems (PMTS) have been the gold standard for labour time measurement
            since the 1970s. The methodology is proven. What's changed is that computer vision and
            AI can now perform the same classification a trained IE analyst does — in a fraction of
            the time, and with a mandatory human review step before anything is finalized.
          </p>
          <button
            onClick={() => navigate("/most-methodology")}
            className="self-start rounded-md border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-accent hover:text-accent transition-colors"
          >
            Learn about PMTS →
          </button>
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────────── */}
      <section className="py-24 bg-ground">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block h-px w-6 bg-accent" />
                <span className="font-mono text-xs uppercase tracking-widest text-accent">Use cases</span>
              </div>
              <h2 className="font-display font-extrabold text-[42px] uppercase text-ink leading-tight">
                Built for the factory floor.
              </h2>
            </div>
            <button onClick={() => navigate("/industries")} className="text-sm font-semibold text-accent hover:underline">
              All industries →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "⚙️", title: "Assembly Lines", desc: "Track cycle time improvements across multiple shifts and operators at the same station." },
              { icon: "📦", title: "Packaging & Kitting", desc: "Identify the ratio of value-add vs. non-value-add motion in packaging operations." },
              { icon: "🔩", title: "Press Operations", desc: "Isolate machine wait time from operator reach-and-grasp cycles on press workstations." },
            ].map((card) => (
              <div key={card.title} className="p-6 rounded-xl border border-line bg-raised hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="font-display font-bold text-xl uppercase text-ink mb-2">{card.title}</h3>
                <p className="text-sm text-ink-dim leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-navy py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display font-extrabold text-5xl uppercase text-white mb-6 leading-tight">
            Ready to replace the stopwatch?
          </h2>
          <p className="text-white/50 text-lg mb-10">
            Upload your first video and run a complete PMTS study in under 10 minutes.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate("/login")}
              className="rounded-md bg-accent px-8 py-4 text-base font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy border-t border-white/10 py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-display font-bold text-white/60 uppercase text-sm">IENEXT</span>
          <div className="flex gap-6 text-xs text-white/40">
            <button onClick={() => navigate("/how-it-works")} className="hover:text-white/70">How It Works</button>
            <button onClick={() => navigate("/most-methodology")} className="hover:text-white/70">MOST Methodology</button>
            <button onClick={() => navigate("/about")} className="hover:text-white/70">About</button>
          </div>
          <span className="text-xs text-white/30">© 2026 IENEXT</span>
        </div>
      </footer>
    </div>
  );
}
