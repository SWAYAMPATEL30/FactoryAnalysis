import { useState } from "react";
import { MarketingNav } from "../../components/layout/MarketingNav";

export function AboutPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      <section className="bg-navy pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">About</span>
          </div>
          <h1 className="font-display font-extrabold text-[56px] uppercase text-white leading-[0.92] mb-6">
            Built by engineers,<br />for industrial engineers.
          </h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
            FactoryAnalysis was built to solve a real problem: MOST studies are essential for
            lean manufacturing, but the manual process hasn't changed in 50 years. We applied
            modern computer vision and AI to automate the observation and classification steps —
            while keeping the human engineer in the loop for everything that matters.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-raised">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="font-display font-extrabold text-2xl uppercase text-ink mb-4">Our approach</h2>
            <div className="flex flex-col gap-4 text-ink-dim leading-relaxed text-sm">
              <p>
                The pipeline is built on established, auditable technology: MediaPipe for face detection
                and hand landmark tracking, YOLO-World for open-vocabulary object detection, and Google
                Vertex AI Gemini Flash for vision-language understanding.
              </p>
              <p>
                We do not publish accuracy claims. The human review gate exists precisely because AI
                classification is not perfect — every flag that goes into review is a place where
                a trained IE's judgment still matters more than a confidence score.
              </p>
              <p>
                The methodology we implement is BasicMOST, the most widely used level for general
                manufacturing operations. We follow the standard MOST parameter definitions and TMU
                lookup tables — we have not invented or modified the methodology.
              </p>
            </div>
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl uppercase text-ink mb-6">Get in touch</h2>
            {sent ? (
              <div className="rounded-xl border border-accent bg-accent-soft p-8 text-center">
                <div className="text-3xl mb-3">✓</div>
                <p className="font-semibold text-ink">Message received</p>
                <p className="text-sm text-ink-dim mt-1">We'll reply within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {(["name", "company", "email"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium uppercase tracking-wide text-ink-faint mb-1.5 capitalize">
                      {field}
                    </label>
                    <input
                      type={field === "email" ? "email" : "text"}
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="w-full rounded-md border border-line bg-raised px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      required
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-ink-faint mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-md border border-line bg-raised px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>
                <button type="submit" className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
