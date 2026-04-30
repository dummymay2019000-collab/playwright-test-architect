import { Card, CardContent } from "@/components/ui/card";
import type { GeneratedTestCase } from "@/lib/types";
import { Layers, ShieldCheck, AlertTriangle, Sparkles, Activity, Lock } from "lucide-react";

interface Props {
  cases: GeneratedTestCase[];
}

export function SummaryCards({ cases }: Props) {
  const total = cases.length;
  const selected = cases.filter(c => c.enabled).length;
  const validation = cases.filter(c => c.category === "validation").length;
  const boundary = cases.filter(c => c.category === "boundary").length;
  const auth = cases.filter(c => c.category === "auth").length;
  const high = cases.filter(c => c.risk === "high").length;

  const items = [
    { label: "Total generated", value: total, icon: Layers, tone: "text-primary bg-primary/10" },
    { label: "Selected for export", value: selected, icon: ShieldCheck, tone: "text-success bg-success/10" },
    { label: "Validation", value: validation, icon: Sparkles, tone: "text-category-validation bg-category-validation/10" },
    { label: "Boundary", value: boundary, icon: Activity, tone: "text-category-boundary bg-category-boundary/10" },
    { label: "Auth", value: auth, icon: Lock, tone: "text-category-auth bg-category-auth/10" },
    { label: "High risk", value: high, icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(it => {
        const Icon = it.icon;
        return (
          <Card key={it.label} className="shadow-elev-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${it.tone}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{it.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
