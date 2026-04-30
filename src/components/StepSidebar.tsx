import { Check, FileJson, ListChecks, Settings2, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Step } from "@/lib/types";

const STEPS: { id: Step; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 1, label: "Request Setup", sub: "Endpoint, headers, auth", icon: Settings2 },
  { id: 2, label: "Payload Analysis", sub: "Detect fields & types", icon: FileJson },
  { id: 3, label: "Constraints", sub: "Optional rules per field", icon: Sparkles },
  { id: 4, label: "Generate Cases", sub: "Review & select", icon: ListChecks },
  { id: 5, label: "Export", sub: "Download spec file", icon: Download },
];

interface Props {
  step: Step;
  onChange: (s: Step) => void;
  reachable: Step;
}

export function StepSidebar({ step, onChange, reachable }: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-lg">⚡</span>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-tight">API TestForge</h1>
            <p className="text-xs text-sidebar-foreground/60">Playwright generator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = s.id < step;
          const disabled = s.id > reachable;
          return (
            <button
              key={s.id}
              onClick={() => !disabled && onChange(s.id)}
              disabled={disabled}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all",
                isActive && "bg-sidebar-accent step-active",
                !isActive && !disabled && "hover:bg-sidebar-accent/60",
                disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                  isDone && "bg-success text-success-foreground",
                  !isActive && !isDone && "bg-sidebar-accent text-sidebar-foreground/70",
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-sidebar-foreground/50">0{idx + 1}</span>
                  <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-sidebar-foreground")}>
                    {s.label}
                  </span>
                </div>
                <p className="text-xs text-sidebar-foreground/50 mt-0.5">{s.sub}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <p className="text-xs font-medium text-white">Local-first</p>
          <p className="text-[11px] text-sidebar-foreground/60 mt-1">
            Drafts persist in your browser. No data leaves your device.
          </p>
        </div>
      </div>
    </aside>
  );
}
