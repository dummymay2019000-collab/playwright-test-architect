import { useEffect, useMemo, useState } from "react";
import { StepSidebar } from "@/components/StepSidebar";
import { RequestSetupForm } from "@/components/RequestSetupForm";
import { PayloadAnalysisTable } from "@/components/PayloadAnalysisTable";
import { ConstraintEditor } from "@/components/ConstraintEditor";
import { RuleEditor } from "@/components/RuleEditor";
import { TestCaseTable } from "@/components/TestCaseTable";
import { SummaryCards } from "@/components/SummaryCards";
import { ExportPreview } from "@/components/ExportPreview";
import { AiAssistPlaceholder } from "@/components/AiAssistPlaceholder";
import { VariantsEditor } from "@/components/VariantsEditor";
import { EnvironmentManager } from "@/components/EnvironmentManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { analyzePayload, safeParseJson } from "@/lib/analyzer";
import { generateTestCases } from "@/lib/generator";
import { generateRuleCases } from "@/lib/rules";
import { generateVariantCases } from "@/lib/variants";
import { buildEnvExample, buildSpecFile, type AttachmentMode } from "@/lib/specBuilder";
import { DEFAULT_CONFIG, clearProject, loadProject, saveProject } from "@/lib/storage";
import { buildProjectExport, parseProjectExport, suggestFilename } from "@/lib/projectBundle";
import { downloadTextFile } from "@/lib/download";
import type { ConditionalRule, Environment, FieldConstraints, FieldSchema, FieldType, GeneratedTestCase, ProjectState, RequestConfig, Step, VariantSet } from "@/lib/types";

interface Props {
  onExit: () => void;
}

export function Workspace({ onExit }: Props) {
  const [config, setConfig] = useState<RequestConfig>(DEFAULT_CONFIG);
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [cases, setCases] = useState<GeneratedTestCase[]>([]);
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [variants, setVariants] = useState<VariantSet[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [reachable, setReachable] = useState<Step>(1);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>("separate");

  // Load draft once
  useEffect(() => {
    const saved = loadProject<ProjectState>();
    if (saved) {
      setConfig({ ...DEFAULT_CONFIG, ...(saved.config ?? {}) });
      setFields(saved.fields ?? []);
      setCases(saved.cases ?? []);
      setRules(saved.rules ?? []);
      setVariants(saved.variants ?? []);
      setEnvironments(saved.environments ?? []);
      setActiveEnvId(saved.activeEnvId ?? null);
      setStep(saved.step ?? 1);
      const r = Math.max(1, saved.step ?? 1) as Step;
      setReachable(r);
    }
  }, []);

  // Persist
  useEffect(() => {
    saveProject({ config, fields, cases, rules, variants, environments, activeEnvId, step });
  }, [config, fields, cases, rules, variants, environments, activeEnvId, step]);

  const handleApplyEnv = (env: Environment) => {
    setConfig({
      ...config,
      baseUrl: env.baseUrl,
      endpoint: env.endpoint,
      headers: env.headers.map(h => ({ ...h })),
      auth: { ...env.auth },
      bodyJson: env.bodyJson || config.bodyJson,
    });
    setActiveEnvId(env.id);
  };

  const handleExportProject = () => {
    const bundle = buildProjectExport({ config, fields, cases, rules, variants, environments, activeEnvId });
    downloadTextFile(suggestFilename(config.apiName), JSON.stringify(bundle, null, 2), "application/json");
    toast.success("Configuration exported");
  };

  const handleImportProject = async (file: File) => {
    const text = await file.text();
    const r = parseProjectExport(text);
    if (!r.ok || !r.data) {
      toast.error("Import failed", { description: r.error });
      return;
    }
    const d = r.data;
    setConfig({ ...DEFAULT_CONFIG, ...d.config });
    setFields(d.fields ?? []);
    setCases(d.cases ?? []);
    setRules(d.rules ?? []);
    setVariants(d.variants ?? []);
    setEnvironments(d.environments ?? []);
    setActiveEnvId(d.activeEnvId ?? null);
    setReachable(5);
    toast.success("Configuration imported");
  };

  const jsonError = useMemo(() => {
    if (!config.bodyJson.trim()) return null;
    const r = safeParseJson(config.bodyJson);
    if (r.ok) return null;
    return r.error;
  }, [config.bodyJson]);

  const goTo = (s: Step) => {
    setStep(s);
    if (s > reachable) setReachable(s);
  };

  const handleAnalyze = () => {
    const { fields: detected, error } = analyzePayload(config.bodyJson);
    if (error) {
      toast.error("Invalid JSON payload", { description: error });
      return;
    }
    if (detected.length === 0) {
      toast.warning("No fields found — payload should be a JSON object.");
    } else {
      toast.success(`Detected ${detected.length} field${detected.length > 1 ? "s" : ""}`);
    }
    // Preserve existing constraints / type overrides where path matches
    const merged = detected.map(d => {
      const prev = fields.find(f => f.path === d.path);
      return prev ? { ...d, type: prev.type, constraints: prev.constraints } : d;
    });
    setFields(merged);
  };

  const updateFieldType = (path: string, type: FieldType) => {
    setFields(fields.map(f => f.path === path ? { ...f, type } : f));
  };

  const updateConstraints = (path: string, constraints: FieldConstraints) => {
    setFields(fields.map(f => f.path === path ? { ...f, constraints } : f));
  };

  const handleGenerate = () => {
    if (jsonError) {
      toast.error("Fix the JSON payload before generating tests");
      return;
    }
    if (fields.length === 0) {
      toast.error("Analyze your payload first");
      return;
    }
    const generated = generateTestCases(config, fields);
    const ruleCases = generateRuleCases(config, fields, rules);
    const variantCases = generateVariantCases(config, fields, variants);
    const all = [...generated, ...variantCases, ...ruleCases];
    setCases(all);
    const extras: string[] = [];
    if (variantCases.length) extras.push(`${variantCases.length} from variants`);
    if (ruleCases.length) extras.push(`${ruleCases.length} from rules`);
    toast.success(
      `Generated ${all.length} test cases${extras.length ? ` (incl. ${extras.join(", ")})` : ""}`,
    );
  };

  const spec = useMemo(() => buildSpecFile(config, cases, { attachmentMode }), [config, cases, attachmentMode]);
  const envExample = useMemo(() => buildEnvExample(config), [config]);

  const handleNext = () => {
    if (step === 1) {
      if (jsonError) {
        toast.error("Fix the JSON payload first");
        return;
      }
      handleAnalyze();
      goTo(2);
    } else if (step === 2) {
      if (fields.length === 0) {
        handleAnalyze();
        return;
      }
      goTo(3);
    } else if (step === 3) {
      handleGenerate();
      goTo(4);
    } else if (step === 4) {
      if (cases.length === 0) {
        handleGenerate();
        return;
      }
      goTo(5);
    }
  };

  const handleReset = () => {
    if (!confirm("Reset the project? This clears your draft from this browser.")) return;
    clearProject();
    setConfig(DEFAULT_CONFIG);
    setFields([]);
    setCases([]);
    setRules([]);
    setVariants([]);
    setEnvironments([]);
    setActiveEnvId(null);
    setStep(1);
    setReachable(1);
    toast.success("Project reset");
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <StepSidebar step={step} onChange={goTo} reachable={reachable} />

      <main className="flex-1 min-w-0">
        {/* Workspace topbar */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onExit}>
              <Home className="w-4 h-4 mr-1.5" /> Home
            </Button>
            <div className="hidden md:block text-sm text-muted-foreground">
              Step {step} of 5 · <span className="text-foreground font-medium">{config.apiName || "Untitled API"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/guide"><BookOpen className="w-4 h-4 mr-1.5" /> Guide</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => goTo(Math.max(1, step - 1) as Step)} disabled={step === 1}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < 5 && (
              <Button size="sm" onClick={handleNext}>
                {step === 4 ? "Go to export" : "Continue"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </header>

        <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
          {step === 1 && (
            <>
              <EnvironmentManager
                config={config}
                environments={environments}
                activeEnvId={activeEnvId}
                onChangeEnvironments={setEnvironments}
                onActivate={setActiveEnvId}
                onApply={handleApplyEnv}
                onExportProject={handleExportProject}
                onImportProject={handleImportProject}
              />
              <RequestSetupForm config={config} onChange={setConfig} onReset={handleReset} />
            </>
          )}

          {step === 2 && (
            <>
              <PayloadAnalysisTable
                fields={fields}
                jsonError={jsonError}
                onChangeType={updateFieldType}
                onAnalyze={handleAnalyze}
              />
              <AiAssistPlaceholder />
            </>
          )}

          {step === 3 && (
            <>
              <ConstraintEditor fields={fields} onChange={updateConstraints} />
              <VariantsEditor variants={variants} fields={fields} onChange={setVariants} />
              <RuleEditor rules={rules} fields={fields} onChange={setRules} />
            </>
          )}

          {step === 4 && (
            <>
              <SummaryCards cases={cases} />
              <TestCaseTable cases={cases} onChange={setCases} onRegenerate={handleGenerate} />
              <AiAssistPlaceholder />
            </>
          )}

          {step === 5 && (
            <>
              <SummaryCards cases={cases} />
              <ExportPreview
                spec={spec}
                envExample={envExample}
                config={config}
                cases={cases}
                attachmentMode={attachmentMode}
                onAttachmentModeChange={setAttachmentMode}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
