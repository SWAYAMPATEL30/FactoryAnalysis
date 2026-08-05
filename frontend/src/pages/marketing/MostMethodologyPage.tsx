import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MarketingNav } from "../../components/layout/MarketingNav";

const PARAMS_G = [
  { letter: "B", name: "Body motion", desc: "Steps, bends, or sitting-down motions of the whole body" },
  { letter: "G", name: "Gain control", desc: "Reaching for and grasping the object" },
  { letter: "A", name: "Action distance", desc: "Moving the object through the air from origin to destination" },
  { letter: "B", name: "Body motion", desc: "Steps or bends during the placement move" },
  { letter: "P", name: "Placement", desc: "Placing the object at its destination — align, position, orient" },
];

export function MostMethodologyPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      {/* Header */}
      <section className="bg-navy pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Methodology</span>
          </div>
          <h1 className="font-display font-extrabold text-[60px] uppercase text-white leading-[0.92] mb-6">
            What is MOST?
          </h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
            MOST (Maynard Operation Sequence Technique) is a pre-determined motion time system
            used worldwide to set standard labor times and evaluate work. It breaks every manual
            task into a fixed sequence of fundamental motions — rather than timing a worker with
            a stopwatch.
          </p>
        </div>
      </section>

      {/* What is MOST */}
      <section className="py-16 px-6 bg-raised">
        <div className="mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display font-extrabold text-3xl uppercase text-ink mb-4">
                A predetermined time system
              </h2>
              <p className="text-ink-dim leading-relaxed mb-4">
                Traditional time-and-motion studies require an industrial engineer to stand beside a
                worker with a stopwatch, manually timing each motion element. This is slow, inconsistent
                across analysts, and uncomfortable for the worker being observed.
              </p>
              <p className="text-ink-dim leading-relaxed mb-4">
                MOST solves this by defining standard time values for every fundamental human motion.
                Reaching for an object at arm's length always takes the same time — whether you measure
                it today or five years from now. These standardized values are compiled into lookup
                tables, and an analyst selects the right index for each motion parameter.
              </p>
              <p className="text-ink-dim leading-relaxed">
                The result: a labor time standard built from first principles, consistent across
                analysts, plants, and countries — and auditable by any IE who knows the methodology.
              </p>
            </div>
            <div className="rounded-xl bg-navy p-8 border border-white/10">
              <div className="font-mono text-xs uppercase tracking-widest text-accent mb-4">Unit of time</div>
              <div className="font-display font-extrabold text-6xl text-white mb-2">1 TMU</div>
              <div className="text-white/60 mb-6">= 0.036 seconds</div>
              <div className="space-y-3 text-sm">
                {[
                  ["Reach & grasp a small object", "60 TMU = 2.2s"],
                  ["Move object 30cm through air", "40 TMU = 1.4s"],
                  ["Place precisely into fixture", "50 TMU = 1.8s"],
                  ["Typical 1-min assembly cycle", "1,000–1,500 TMU"],
                ].map(([action, value]) => (
                  <div key={action} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">{action}</span>
                    <span className="font-mono text-accent font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Sequence Models */}
      <section className="py-16 px-6 bg-ground">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display font-extrabold text-3xl uppercase text-ink mb-2">
            Three core sequence models
          </h2>
          <p className="text-ink-dim mb-10">
            Every manual motion at a workstation falls into one of three categories.
            Per standard BasicMOST methodology.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                code: "G",
                name: "General Move",
                color: "bg-blue-50 border-blue-200",
                badge: "bg-blue-100 text-blue-800",
                desc: "Freely moving an object through the air from one location to another. The object leaves the surface. Examples: reaching into a bin, moving a part to a fixture, disposing of a completed assembly.",
                params: "Sequence: B · G · A · B · P",
              },
              {
                code: "C",
                name: "Controlled Move",
                color: "bg-purple-50 border-purple-200",
                badge: "bg-purple-100 text-purple-800",
                desc: "Moving an object while it remains in contact with a surface or attached to a machine. Motion is constrained by a guide, track, or mechanism. Examples: pushing a lever, turning a knob, sliding a drawer.",
                params: "Sequence: A · B · C · M · X · I · A",
              },
              {
                code: "T",
                name: "Tool Use",
                color: "bg-green-50 border-green-200",
                badge: "bg-green-100 text-green-800",
                desc: "Using a standard tool, fastener, or machine as part of the operation. Includes the reach, grasp, and placement implied by tool operation. Examples: using a wrench, electric screwdriver, measuring gauge, hammer.",
                params: "Sequence: A · B · T · A · B · P",
              },
            ].map((model) => (
              <motion.div
                key={model.code}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                viewport={{ once: true }}
                className={`rounded-xl border p-6 ${model.color}`}
              >
                <span className={`inline-block font-mono font-bold text-xs px-2 py-1 rounded mb-3 ${model.badge}`}>
                  {model.code} — {model.name}
                </span>
                <p className="text-sm text-ink-dim leading-relaxed mb-4">{model.desc}</p>
                <div className="font-mono text-xs text-ink-faint bg-black/5 rounded px-3 py-1.5">
                  {model.params}
                </div>
              </motion.div>
            ))}
          </div>

          {/* General Move parameter breakdown */}
          <div className="rounded-xl border border-line bg-raised p-8">
            <h3 className="font-display font-bold text-2xl uppercase text-ink mb-6">
              General Move — B·G·A·B·P parameters
            </h3>
            <div className="flex flex-col gap-3">
              {PARAMS_G.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center font-display font-extrabold text-lg text-accent shrink-0">
                    {p.letter}
                  </div>
                  <div>
                    <div className="font-semibold text-ink text-sm">{p.name}</div>
                    <div className="text-xs text-ink-dim">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Levels of MOST */}
      <section className="py-16 px-6 bg-raised">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display font-extrabold text-3xl uppercase text-ink mb-8">
            Levels of MOST
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { level: "MiniMOST", cycle: "< 10 seconds", desc: "Very short, highly repetitive cycles. Packing lines, component insertion.", current: false },
              { level: "BasicMOST", cycle: "10 sec – 2 min", desc: "General-purpose assembly and manufacturing operations. This is the level this product targets.", current: true },
              { level: "MaxiMOST", cycle: "> 2 minutes", desc: "Long, non-repetitive tasks. Maintenance, large equipment assembly.", current: false },
            ].map((lvl) => (
              <div
                key={lvl.level}
                className={`rounded-xl border p-6 relative ${lvl.current ? "border-accent bg-accent-soft" : "border-line bg-raised-2"}`}
              >
                {lvl.current && (
                  <div className="absolute top-4 right-4 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] text-white uppercase tracking-wide">
                    This product
                  </div>
                )}
                <div className="font-display font-extrabold text-2xl uppercase text-ink mb-1">{lvl.level}</div>
                <div className="font-mono text-xs text-ink-faint mb-3">{lvl.cycle}</div>
                <p className="text-sm text-ink-dim leading-relaxed">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How AI maps to MOST */}
      <section className="py-16 px-6 bg-navy">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display font-extrabold text-3xl uppercase text-white mb-6">
            How the AI maps to MOST
          </h2>
          <p className="text-white/60 leading-relaxed mb-8 max-w-2xl">
            The computer-vision layer (MediaPipe + YOLO-World) performs the same observation
            a trained analyst would do — tracking what the worker's hands are doing, what objects
            are being handled, and whether a machine is active. The AI model (Gemini Flash via
            Vertex AI) then classifies each observed motion segment against the MOST data cards,
            selecting parameter index values from the same fixed lookup tables a human analyst
            would use. A confidence score is attached to every classification. Anything below
            the threshold is flagged for mandatory human review — an engineer always has final
            say before the report is finalized.
          </p>
          <button
            onClick={() => navigate("/how-it-works")}
            className="rounded-md border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-accent hover:text-accent transition-colors"
          >
            See the full pipeline →
          </button>
        </div>
      </section>
    </div>
  );
}
