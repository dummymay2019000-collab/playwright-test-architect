import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AiAssistPlaceholder() {
  return (
    <Card className="border-dashed bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Assist
            <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wide border-primary/30 text-primary">Coming soon</Badge>
          </CardTitle>
        </div>
        <CardDescription>
          Future versions can suggest business-aware edge cases from API docs, response examples, and field names.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-3 gap-2">
        <Button disabled variant="outline" className="justify-start">
          <Lightbulb className="w-4 h-4 mr-2" /> Suggest more cases
        </Button>
        <Button disabled variant="outline" className="justify-start">
          <AlertTriangle className="w-4 h-4 mr-2" /> Explain failures
        </Button>
        <Button disabled variant="outline" className="justify-start">
          <ArrowUpRight className="w-4 h-4 mr-2" /> Prioritize high-risk
        </Button>
      </CardContent>
    </Card>
  );
}
