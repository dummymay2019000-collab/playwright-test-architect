import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, FileCode2, FileSpreadsheet, FileText, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { copyToClipboard, downloadTextFile } from "@/lib/download";
import { toast } from "sonner";
import type { GeneratedTestCase, RequestConfig } from "@/lib/types";
import type { AttachmentMode } from "@/lib/specBuilder";
import {
  buildAdoRows,
  buildJiraRows,
  buildTestCaseTitle,
  downloadCasesAsCsv,
  downloadCasesAsXlsx,
  DEFAULT_NAMING_TEMPLATE,
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_RISK_LABELS,
  type CaseExportFormat,
  type NamingTemplate,
  type RouteSlugStyle,
} from "@/lib/caseExporter";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Props {
  spec: string;
  envExample: string;
  config: RequestConfig;
  cases: GeneratedTestCase[];
  attachmentMode: AttachmentMode;
  onAttachmentModeChange: (m: AttachmentMode) => void;
}

export function ExportPreview({
  spec,
  envExample,
  config,
  cases,
  attachmentMode,
  onAttachmentModeChange,
}: Props) {
  const enabled = cases.filter(c => c.enabled);
  const slug = (config.apiName || "api").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "api";
  const specName = `${slug}.spec.ts`;

  const [selectedCaseId, setSelectedCaseId] = useState<string>(enabled[0]?.id ?? "");
  const selectedCase = useMemo(
    () => enabled.find(c => c.id === selectedCaseId) ?? enabled[0],
    [enabled, selectedCaseId],
  );

  const grepCommand = selectedCase
    ? `npx playwright test ${specName} --grep "@id-${selectedCase.id}"`
    : `npx playwright test ${specName}`;

  const [exportFormat, setExportFormat] = useState<CaseExportFormat>("ado");
  const [naming, setNaming] = useState<NamingTemplate>(DEFAULT_NAMING_TEMPLATE);

  const updateCategoryLabel = (key: string, value: string) =>
    setNaming(n => ({ ...n, categoryLabels: { ...n.categoryLabels, [key]: value } }));
  const updateRiskLabel = (key: string, value: string) =>
    setNaming(n => ({ ...n, riskLabels: { ...n.riskLabels, [key]: value } }));
  const resetNaming = () => setNaming(DEFAULT_NAMING_TEMPLATE);

  const previewRows = useMemo(() => {
    if (enabled.length === 0) return [];
    return exportFormat === "ado"
      ? (buildAdoRows(config, enabled, naming) as unknown as Record<string, unknown>[])
      : (buildJiraRows(config, enabled, naming) as unknown as Record<string, unknown>[]);
  }, [config, enabled, exportFormat, naming]);

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? `${label} copied` : "Could not copy");
  };

  const downloadCases = () => {
    const json = JSON.stringify({ generatedAt: new Date().toISOString(), config, cases: enabled }, null, 2);
    downloadTextFile("test-cases.json", json, "application/json");
  };

  const handleCsv = () => {
    if (enabled.length === 0) {
      toast.error("No test cases selected");
      return;
    }
    downloadCasesAsCsv(config, enabled, exportFormat, slug, naming);
    toast.success(`${enabled.length} cases exported as CSV (${exportFormat.toUpperCase()})`);
  };
  const handleXlsx = () => {
    if (enabled.length === 0) {
      toast.error("No test cases selected");
      return;
    }
    downloadCasesAsXlsx(config, enabled, exportFormat, slug, naming);
    toast.success(`${enabled.length} cases exported as XLSX (${exportFormat.toUpperCase()})`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-primary" />
              Export preview
            </CardTitle>
            <CardDescription>
              {enabled.length} of {cases.length} cases included. Drop the file into your Playwright project.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadTextFile(specName, spec, "text/typescript")}>
              <Download className="w-4 h-4 mr-2" /> {specName}
            </Button>
            <Button variant="outline" onClick={() => downloadTextFile(".env.example", envExample, "text/plain")}>
              <Download className="w-4 h-4 mr-2" /> .env.example
            </Button>
            <Button variant="outline" onClick={downloadCases}>
              <Download className="w-4 h-4 mr-2" /> test-cases.json
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export options */}
        <div className="grid gap-6 md:grid-cols-2 rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Report attachments</Label>
            <p className="text-xs text-muted-foreground">
              How request &amp; response payloads are attached to the Playwright HTML report.
            </p>
            <RadioGroup
              value={attachmentMode}
              onValueChange={(v) => onAttachmentModeChange(v as AttachmentMode)}
              className="mt-2 space-y-1.5"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="separate" id="att-separate" className="mt-0.5" />
                <Label htmlFor="att-separate" className="font-normal cursor-pointer">
                  Separate <span className="text-muted-foreground">— two attachments: request.json and response.json</span>
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="combined" id="att-combined" className="mt-0.5" />
                <Label htmlFor="att-combined" className="font-normal cursor-pointer">
                  Combined <span className="text-muted-foreground">— single payloads.json with {`{ request, response }`}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Run a specific test case
            </Label>
            <p className="text-xs text-muted-foreground">
              Each case is tagged <code className="px-1 py-0.5 rounded bg-muted text-foreground">@id-&lt;caseId&gt;</code>. Pick one to get the exact command.
            </p>
            <Select
              value={selectedCase?.id ?? ""}
              onValueChange={setSelectedCaseId}
              disabled={enabled.length === 0}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a test case" />
              </SelectTrigger>
              <SelectContent>
                {enabled.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    [{c.category}] {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative mt-2">
              <pre className="code-surface px-3 py-2 pr-12 text-xs font-mono whitespace-pre-wrap break-all">
                {grepCommand}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-1.5 right-1.5 h-7"
                onClick={() => copy(grepCommand, "Command")}
                disabled={!selectedCase}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Test management export */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Test management export (CSV / Excel)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Importable into Azure DevOps Test Plans, Jira (Xray / Zephyr), TestRail, etc. Each
                row follows a consistent naming convention with prerequisites, steps, payload, and expected result.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCsv}>
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
              <Button size="sm" onClick={handleXlsx}>
                <Download className="w-4 h-4 mr-2" /> Excel (.xlsx)
              </Button>
            </div>
          </div>
          <RadioGroup
            value={exportFormat}
            onValueChange={(v) => setExportFormat(v as CaseExportFormat)}
            className="grid sm:grid-cols-2 gap-2"
          >
            <label
              htmlFor="fmt-ado"
              className="flex items-start gap-2 rounded-md border bg-background p-3 cursor-pointer hover:border-primary/50"
            >
              <RadioGroupItem value="ado" id="fmt-ado" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Azure DevOps Test Plans</div>
                <div className="text-xs text-muted-foreground">
                  One row per step. Columns: Title, Test Step, Step Action, Step Expected, Priority, Tags, State.
                </div>
              </div>
            </label>
            <label
              htmlFor="fmt-jira"
              className="flex items-start gap-2 rounded-md border bg-background p-3 cursor-pointer hover:border-primary/50"
            >
              <RadioGroupItem value="jira" id="fmt-jira" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Jira / Xray / Generic</div>
                <div className="text-xs text-muted-foreground">
                  One row per case. Columns: Summary, Description, Preconditions, Test Steps, Test Data, Expected Result, Priority, Labels.
                </div>
              </div>
            </label>
          </RadioGroup>

          <Accordion type="single" collapsible className="rounded-md border bg-background">
            <AccordionItem value="naming" className="border-0">
              <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">Naming template</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Customize prefix, route slug style, and category / risk wording.
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title template</Label>
                    <Input
                      value={naming.titleTemplate}
                      onChange={e => setNaming(n => ({ ...n, titleTemplate: e.target.value }))}
                      className="font-mono text-xs"
                      placeholder="{prefix}[{method} {route}] {category}: {name}"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Tokens: <code>{`{prefix}`}</code> <code>{`{method}`}</code> <code>{`{route}`}</code>{" "}
                      <code>{`{category}`}</code> <code>{`{risk}`}</code> <code>{`{name}`}</code>{" "}
                      <code>{`{id}`}</code>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prefix (e.g. project key)</Label>
                    <Input
                      value={naming.prefix}
                      onChange={e => setNaming(n => ({ ...n, prefix: e.target.value }))}
                      placeholder="API-"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Route style</Label>
                    <Select
                      value={naming.routeStyle}
                      onValueChange={(v) => setNaming(n => ({ ...n, routeStyle: v as RouteSlugStyle }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verbatim">Verbatim — /users/{`{id}`}</SelectItem>
                        <SelectItem value="noSlash">No leading slash — users/{`{id}`}</SelectItem>
                        <SelectItem value="kebab">kebab-case — users-id</SelectItem>
                        <SelectItem value="snake">snake_case — users_id</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Category labels</Label>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.keys(DEFAULT_CATEGORY_LABELS).map(key => (
                      <div key={key} className="space-y-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground">{key}</span>
                        <Input
                          value={naming.categoryLabels[key] ?? ""}
                          onChange={e => updateCategoryLabel(key, e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Risk labels</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(DEFAULT_RISK_LABELS).map(key => (
                      <div key={key} className="space-y-0.5">
                        <span className="text-[10px] uppercase text-muted-foreground">{key}</span>
                        <Input
                          value={naming.riskLabels[key] ?? ""}
                          onChange={e => updateRiskLabel(key, e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Example:{" "}
                    <span className="font-mono text-foreground">
                      {enabled[0]
                        ? buildTestCaseTitle(config, enabled[0], naming)
                        : "(no cases)"}
                    </span>
                  </p>
                  <Button variant="ghost" size="sm" onClick={resetNaming}>
                    Reset
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="rounded-md border bg-background overflow-hidden">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/40">
              Preview — first row of <code className="font-mono">{slug}-{exportFormat}.{`{csv,xlsx}`}</code>
            </div>
            <div className="max-h-64 overflow-auto">
              {previewRows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-3">No cases selected.</p>
              ) : (
                <table className="text-xs w-full">
                  <tbody>
                    {Object.entries(previewRows[0]).map(([k, v]) => (
                      <tr key={k} className="border-b last:border-b-0 align-top">
                        <td className="font-medium px-3 py-1.5 whitespace-nowrap text-muted-foreground w-40">
                          {k}
                        </td>
                        <td className="px-3 py-1.5 font-mono whitespace-pre-wrap break-words">
                          {String(v ?? "").slice(0, 600) || <span className="text-muted-foreground italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="spec">
          <TabsList>
            <TabsTrigger value="spec"><FileCode2 className="w-3.5 h-3.5 mr-1.5" /> {specName}</TabsTrigger>
            <TabsTrigger value="env"><FileText className="w-3.5 h-3.5 mr-1.5" /> .env.example</TabsTrigger>
            <TabsTrigger value="cases"><FileText className="w-3.5 h-3.5 mr-1.5" /> test-cases.json</TabsTrigger>
          </TabsList>

          <TabsContent value="spec">
            <CodePreview content={spec} onCopy={() => copy(spec, "Spec")} />
          </TabsContent>
          <TabsContent value="env">
            <CodePreview content={envExample} onCopy={() => copy(envExample, ".env.example")} />
          </TabsContent>
          <TabsContent value="cases">
            <CodePreview
              content={JSON.stringify({ config, cases: enabled }, null, 2)}
              onCopy={() => copy(JSON.stringify({ config, cases: enabled }, null, 2), "Cases JSON")}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CodePreview({ content, onCopy }: { content: string; onCopy: () => void }) {
  return (
    <div className="relative mt-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={onCopy}
        className="absolute top-3 right-3 z-10"
      >
        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
      </Button>
      <pre className="code-surface p-5 pr-24 max-h-[560px] overflow-auto text-xs leading-relaxed font-mono whitespace-pre">
        <code>{highlight(content)}</code>
      </pre>
    </div>
  );
}

// Lightweight highlighter — no external dep. Tokenizes once, returns React nodes.
function highlight(src: string): React.ReactNode {
  const tokens: { text: string; cls?: string }[] = [];
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(import|from|export|const|let|var|function|return|if|else|for|of|in|new|async|await|test|describe|expect|true|false|null|undefined|as|interface|type|process|env)\b|\b(\d+(?:\.\d+)?)\b/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > lastIndex) tokens.push({ text: src.slice(lastIndex, m.index) });
    if (m[1]) tokens.push({ text: m[1], cls: "text-slate-500" });
    else if (m[2]) tokens.push({ text: m[2], cls: "text-emerald-300" });
    else if (m[3]) tokens.push({ text: m[3], cls: "text-violet-300" });
    else if (m[4]) tokens.push({ text: m[4], cls: "text-amber-300" });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < src.length) tokens.push({ text: src.slice(lastIndex) });
  return tokens.map((t, i) => t.cls ? <span key={i} className={t.cls}>{t.text}</span> : <span key={i}>{t.text}</span>);
}
