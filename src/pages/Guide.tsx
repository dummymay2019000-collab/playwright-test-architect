import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Boxes, Compass, Download, FileJson, Globe, Layers, ListChecks, Settings2, Shield, Sparkles, Upload } from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "workflow", label: "5-step workflow", icon: ListChecks },
  { id: "request-setup", label: "Request setup", icon: Settings2 },
  { id: "payload-analysis", label: "Payload analysis", icon: FileJson },
  { id: "constraints-rules", label: "Constraints, variants & rules", icon: Sparkles },
  { id: "environments", label: "Environments", icon: Globe },
  { id: "import-export", label: "Import / Export config", icon: Upload },
  { id: "test-export", label: "Test management export", icon: Layers },
  { id: "playwright", label: "Playwright spec output", icon: Shield },
  { id: "tips", label: "Tips & FAQ", icon: Boxes },
];

export default function Guide() {
  const [active, setActive] = useState<string>("overview");

  useEffect(() => {
    document.title = "Guide — API TestForge";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Learn how API TestForge turns one sample request into a full Playwright test suite — request setup, payload rules, environments, exports, and tips.";
    if (meta) meta.setAttribute("content", desc);
  }, []);

  useEffect(() => {
    const ids = SECTIONS.map(s => s.id);
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar nav */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center shadow-glow">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold tracking-tight">Guide</h1>
              <p className="text-xs text-sidebar-foreground/60">API TestForge</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button asChild variant="outline" size="sm" className="w-full bg-transparent border-sidebar-border text-white hover:bg-sidebar-accent">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to app</Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="lg:hidden h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="w-4 h-4" /> Guide
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
          </Button>
        </header>

        <article className="px-5 md:px-10 py-10 max-w-3xl mx-auto space-y-12 animate-fade-in">
          <Section id="overview" title="What is API TestForge?">
            <p>
              API TestForge is a browser-only tool that turns a single sample API request into a complete{" "}
              <a href="https://playwright.dev/docs/api-testing" target="_blank" rel="noreferrer" className="text-primary underline">
                Playwright
              </a>{" "}
              API test suite. Paste an endpoint, headers, and a JSON payload — TestForge analyzes the fields and generates positive,
              negative, boundary, format, security, and auth coverage you can download as a self-contained <code>.spec.ts</code> file.
            </p>
            <p>Everything runs in your browser. Your draft is persisted locally — no data leaves your device.</p>
          </Section>

          <Section id="workflow" title="The 5-step workflow">
            <ol className="list-decimal pl-5 space-y-2">
              <li><strong>Request setup</strong> — define method, URL, headers, auth, and a sample payload.</li>
              <li><strong>Payload analysis</strong> — TestForge detects each field's type and confidence. Override types where needed.</li>
              <li><strong>Constraints</strong> — add per-field rules, enum-driven variants, and cross-field conditional rules.</li>
              <li><strong>Generate cases</strong> — review, enable/disable, edit, and adjust expected statuses per case.</li>
              <li><strong>Export</strong> — download the Playwright spec, sample <code>.env</code>, JSON cases, or CSV/XLSX for ADO/Jira.</li>
            </ol>
          </Section>

          <Section id="request-setup" title="Request setup">
            <p>
              Start with the basics: API name, HTTP method, base URL, and endpoint path. Add only headers your API actually
              needs — <code>Content-Type</code> is added automatically.
            </p>
            <p>
              Pick the <strong>Test depth</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Basic</strong> — happy path, required-field omission, auth checks. Fast smoke coverage.</li>
              <li><strong>Standard</strong> (recommended) — adds wrong-type, extra-field, boundary, and enum checks.</li>
              <li><strong>Aggressive</strong> — also includes long strings, injection-style values, and precision edges.</li>
            </ul>
            <p>
              The <strong>Expected status codes</strong> defaults (success, validation, unauthorized, forbidden, not found) are
              applied to every generated case, but you can still override any individual case before exporting.
            </p>
          </Section>

          <Section id="payload-analysis" title="Payload analysis">
            <p>
              Once your JSON parses cleanly, TestForge infers each field's type (string, email, number, boolean, date, array,
              object) and assigns a confidence score. Promote, demote, or change a type when the inference is wrong — for
              example, marking a 6-digit string as a phone number instead of a numeric.
            </p>
            <p>
              Nested objects and arrays are flattened into dotted paths (e.g. <code>address.city</code>, <code>items[0].sku</code>).
            </p>
          </Section>

          <Section id="constraints-rules" title="Constraints, variants & rules">
            <p>Three complementary mechanisms shape the generated payload:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Per-field constraints</strong> — required, min/max, length bounds, enum values, regex, precision,
                allow null/empty. Each constraint becomes one or more negative test cases.
              </li>
              <li>
                <strong>Variants</strong> — when a discriminator field (e.g. <code>type</code>, <code>paymentMethod</code>)
                drives different payload shapes, declare each branch's added fields and removed paths. TestForge generates a
                happy-path case per branch.
              </li>
              <li>
                <strong>Conditional rules</strong> — cross-field "if A then B" logic (e.g. <em>if status = "shipped" then trackingId required</em>).
                Use these for constraints that depend on another field's value.
              </li>
            </ul>
          </Section>

          <Section id="environments" title="Environments">
            <p>
              Save named presets — dev, staging, prod, sandbox — each with its own base URL, endpoint, headers, auth env
              variable, and full payload override. Switch between them in step 1 and click <strong>Apply to form</strong> to
              load the values into the active configuration.
            </p>
            <p>
              Use <strong>Add from current</strong> to snapshot whatever you have on screen as a new environment. Each
              environment can use a different auth env variable (e.g. <code>API_TOKEN_PROD</code> vs <code>API_TOKEN_STAGING</code>),
              so the generated <code>.env.example</code> stays clean.
            </p>
          </Section>

          <Section id="import-export" title="Import / Export configuration">
            <p>
              Use <strong>Export config</strong> on step 1 to download a single JSON file containing your full project state:
              request setup, fields, constraints, variants, rules, environments, and generated cases.
            </p>
            <p>
              When the API later changes (a new field added, an old one removed), use <strong>Import config</strong> to
              restore the saved bundle and tweak only what changed — no need to start from scratch. The file is versioned, so
              future TestForge releases can read older exports safely.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Filename pattern: <code>testforge-&lt;api-slug&gt;-&lt;date&gt;.json</code>
            </p>
          </Section>

          <Section id="test-export" title="Test management export (CSV / XLSX)">
            <p>
              On the Export page, the <strong>Test management export</strong> section produces ADO- or Jira-style rows you can
              import directly into Azure DevOps, Jira/Xray, Zephyr, or TestRail. Each case includes a standardized 5-step
              procedure (env setup → headers/auth → payload → request → response verification), test data, expected result,
              priority, and tags.
            </p>
            <p>
              Customize the <strong>Naming template</strong> (prefix, route slug style, category/risk wording) so titles match
              your team's conventions before downloading.
            </p>
          </Section>

          <Section id="playwright" title="Playwright spec output">
            <p>
              The generated <code>.spec.ts</code> is self-contained: helpers for headers, payload building, attachment writing,
              and a JSON report writer are all inlined. Run it with:
            </p>
            <pre className="code-surface p-4 text-xs md:text-sm font-mono overflow-x-auto">
{`npx playwright test path/to/your.spec.ts
# Run a single case by ID
npx playwright test --grep "tc_xxx"`}
            </pre>
            <p>
              Bearer tokens are read from <code>process.env</code> — they're never hardcoded in the spec. A matching
              <code> .env.example</code> file lists the variables you need.
            </p>
          </Section>

          <Section id="tips" title="Tips & FAQ">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Where is my data?</strong> Everything is in <code>localStorage</code>. Clearing site data wipes the draft.</li>
              <li><strong>Reset the project</strong> from step 1's "Reset" button if you want to start over.</li>
              <li><strong>API changed?</strong> Export your config, edit fields/payload, re-analyze, regenerate cases.</li>
              <li><strong>Multi-tenant testing?</strong> Use environments with distinct auth env variable names per tenant.</li>
              <li><strong>Need a single attachment per case?</strong> Toggle the attachment mode on the Export page.</li>
            </ul>
          </Section>
        </article>
      </main>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed space-y-3 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted">
        {children}
      </div>
    </section>
  );
}
