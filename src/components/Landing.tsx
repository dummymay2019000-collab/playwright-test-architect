import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, FileCode2, Sparkles } from "lucide-react";

interface Props {
  onStart: () => void;
  hasDraft: boolean;
}

export function Landing({ onStart, hasDraft }: Props) {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Top nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-hero flex items-center justify-center shadow-glow">
              <span className="text-white font-bold">⚡</span>
            </div>
            <span className="font-semibold tracking-tight">API TestForge</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://playwright.dev/docs/api-testing" target="_blank" rel="noreferrer">Playwright docs</a>
            </Button>
            <Button onClick={onStart}>
              {hasDraft ? "Resume project" : "Start building"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 lg:py-28">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-5 border-primary/30 text-primary bg-primary/5">
            <Sparkles className="w-3 h-3 mr-1.5" /> Browser-only · No backend · Local-first
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Turn one sample API request into a{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">production-ready</span>{" "}
            Playwright test file.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Paste an endpoint, headers, and a JSON payload. API TestForge analyzes your fields and generates positive,
            negative, boundary, format, security, and auth coverage — exported as a clean <code className="font-mono text-sm">.spec.ts</code>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart} className="bg-gradient-hero text-white hover:opacity-90 shadow-elev-md">
              {hasDraft ? "Resume your project" : "Open the generator"} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={onStart}>
              See sample output
            </Button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-20">
          <FeatureCard
            icon={Zap}
            title="Smart payload analysis"
            text="Auto-detects strings, emails, dates, numbers, booleans — with confidence scores you can override."
          />
          <FeatureCard
            icon={Shield}
            title="Security & auth coverage"
            text="Built-in cases for missing tokens, invalid bearers, injection strings, and unicode payloads."
          />
          <FeatureCard
            icon={FileCode2}
            title="Drop-in Playwright spec"
            text="Generates a self-contained .spec.ts with helpers, env-based tokens, and a JSON report writer."
          />
        </div>

        {/* Code preview teaser */}
        <div className="mt-16 code-surface p-6 max-w-3xl mx-auto shadow-elev-lg">
          <div className="flex items-center gap-1.5 mb-4">
            <span className="w-3 h-3 rounded-full bg-destructive/60" />
            <span className="w-3 h-3 rounded-full bg-warning/60" />
            <span className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs text-slate-400 font-mono">create-user.spec.ts</span>
          </div>
          <pre className="text-xs md:text-sm leading-relaxed font-mono overflow-x-auto">
{`test.describe("Create User", () => {
  for (const tc of CASES) {
    test(\`[\${tc.category}] \${tc.name}\`, async () => {
      const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
      const headers = applyHeadersOverride(tc);
      const payload = buildPayload(tc);
      const res = await ctx.fetch(ENDPOINT, { method: METHOD, headers, data: payload });
      expect.soft(res.status()).toBe(tc.expectedStatus);
    });
  }
});`}
          </pre>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elev-sm hover:shadow-elev-md transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{text}</p>
    </div>
  );
}
