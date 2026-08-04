import { motion } from "framer-motion";
import { MarketingNav } from "../../components/layout/MarketingNav";

const PIPELINE = [
  {
    stage: "01 — Upload",
    title: "Drop the video",
    color: "bg-blue-500/20 border-blue-400/30",
    accent: "text-blue-400",
    desc: "Any MP4 or MOV file up to 512 MB. A 1-minute assembly cycle is ideal. The video travels directly to a secure processing container — it is never stored unencrypted.",
    detail: "Supported: MP4, MOV, AVI · Max: 512 MB · Recommended: 30–120 seconds",
  },
  {
    stage: "02 — Face Blur",
    title: "Mandatory privacy pass",
    color: "bg-orange-500/20 border-orange-400/30",
    accent: "text-orange-400",
    desc: "Before any AI model sees a single frame, MediaPipe Face Detection identifies every face in the video. OpenCV replaces each with a blurred region. This is not optional — the blurred copy is what goes into all downstream processing.",
    detail: "MediaPipe detection runs every 3rd frame · boxes cached between · 1,800 frames processed for a 1-min 30fps video",
  },
  {
    stage: "03 — CV Tracking",
    title: "Frame-by-frame motion tracking",
    color: "bg-purple-500/20 border-purple-400/30",
    accent: "text-purple-400",
    desc: "A computer vision stack samples the blurred video at 4 frames per second. YOLO-World detects objects in the worker's workspace. MediaPipe tracks hand landmarks. Machine state (IDLE vs ACTUATING) is detected by pixel-difference analysis.",
    detail: "Sample rate: 4fps · 240 frames per 1-min video · YOLO-World (yolov8s-world) + MediaPipe Hands + cv2.absdiff",
  },
  {
    stage: "04 — AI Segmentation",
    title: "Gemini identifies motion boundaries",
    color: "bg-accent/20 border-accent/30",
    accent: "text-accent",
    desc: "The blurred video — plus the CV tracking events — is sent to Google Vertex AI Gemini Flash. Gemini identifies where one motion element ends and the next begins, producing a time-stamped list of segments each described in plain language.",
    detail: "Model: Gemini Flash (Vertex AI) · Video tokens: ~258/frame sampled at 1fps · Typical segments: 8–15 per 1-min video",
  },
  {
    stage: "05 — MOST Classification",
    title: "Segments mapped to MOST data cards",
    color: "bg-green-500/20 border-green-400/30",
    accent: "text-green-400",
    desc: "A second structured AI call classifies each segment against BasicMOST data cards: General Move (G), Controlled Move (C), or Tool Use (T). Each parameter index value is selected from the fixed MOST tables — nothing is free-text invented.",
    detail: "JSON schema output · validation against MOST lookup tables in code · confidence < 0.55 → flagged for human review",
  },
  {
    stage: "06 — TMU & Report",
    title: "Time values calculated, Excel generated",
    color: "bg-amber/20 border-amber/30",
    accent: "text-amber",
    desc: "A deterministic Python engine computes the TMU value for each row using the standard MOST formula (index sum × 10 TMU). The result is written to a formatted Excel workbook matching the standard MOST analysis template.",
    detail: "1 TMU = 0.036 seconds · Report: motion rows, cycle time, Va/NVa classification, human review flags",
  },
  {
    stage: "07 — Human Review",
    title: "Engineer approves before finalizing",
    color: "bg-red-500/20 border-red-400/30",
    accent: "text-red-400",
    desc: "Any segment with confidence below the threshold is flagged and held in a review queue. A trained engineer inspects flagged rows, corrects classification if needed, and approves. The Excel report is only finalized after this gate.",
    detail: "Review flags: confidence < 0.55, or failed validation against MOST tables · Human always has final say",
  },
];

export function HowItWorksPage() {
  return (
    <div className="bg-ground min-h-screen">
      <MarketingNav />

      {/* Header */}
      <section className="bg-navy pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">The pipeline</span>
          </div>
          <h1 className="font-display font-extrabold text-[60px] uppercase text-white leading-[0.92] mb-6">
            How it works
          </h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
            Seven stages from video upload to signed-off MOST report. Every stage is explained
            below — including which AI model runs at each step and what data it processes.
          </p>
        </div>
      </section>

      {/* Pipeline stages */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl flex flex-col gap-6">
          {PIPELINE.map((stage, i) => (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-6 md:p-8 ${stage.color}`}
            >
              <div className={`font-mono text-xs uppercase tracking-widest mb-2 ${stage.accent}`}>
                {stage.stage}
              </div>
              <h2 className="font-display font-bold text-2xl uppercase text-ink mb-3">
                {stage.title}
              </h2>
              <p className="text-ink-dim leading-relaxed mb-4">{stage.desc}</p>
              <div className="rounded-md bg-black/5 border border-black/10 px-4 py-2 font-mono text-xs text-ink-faint">
                {stage.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Key guarantees */}
      <section className="py-16 px-6 bg-navy">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display font-extrabold text-3xl uppercase text-white mb-8">
            What never happens
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "No unblurred video to AI", desc: "The original video with unblurred faces is never sent to any AI model. Only the blurred copy crosses the network boundary." },
              { title: "No auto-finalized reports", desc: "The human review gate (Stage 7) is mandatory. Low-confidence classifications are always held for engineer approval." },
              { title: "No invented MOST values", desc: "Parameter indices are selected from fixed lookup tables defined in code. The AI cannot invent a parameter value that doesn't exist in the MOST standard." },
            ].map((g) => (
              <div key={g.title} className="p-6 rounded-xl border border-white/10 bg-white/5">
                <div className="text-accent text-2xl mb-3">✓</div>
                <h3 className="font-semibold text-white mb-2">{g.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
