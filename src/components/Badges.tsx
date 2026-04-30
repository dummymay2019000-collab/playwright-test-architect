import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category, Risk } from "@/lib/types";

const CATEGORY_STYLES: Record<Category, string> = {
  positive: "bg-category-positive/10 text-category-positive border-category-positive/30",
  validation: "bg-category-validation/10 text-category-validation border-category-validation/30",
  boundary: "bg-category-boundary/10 text-category-boundary border-category-boundary/30",
  format: "bg-category-format/10 text-category-format border-category-format/30",
  security: "bg-category-security/10 text-category-security border-category-security/30",
  auth: "bg-category-auth/10 text-category-auth border-category-auth/30",
  custom: "bg-category-custom/10 text-category-custom border-category-custom/30",
};

const RISK_STYLES: Record<Risk, string> = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", CATEGORY_STYLES[category])}>
      {category}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", RISK_STYLES[risk])}>
      {risk} risk
    </Badge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high: "bg-success/10 text-success border-success/30",
    medium: "bg-warning/10 text-warning border-warning/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={cn("capitalize", map[confidence])}>
      {confidence}
    </Badge>
  );
}
