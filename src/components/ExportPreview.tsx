import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, FileCode2, FileText } from "lucide-react";
import { copyToClipboard, downloadTextFile } from "@/lib/download";
import { toast } from "sonner";
import type { GeneratedTestCase, RequestConfig } from "@/lib/types";

interface Props {
  spec: string;
  envExample: string;
  config: RequestConfig;
  cases: GeneratedTestCase[];
}

export function ExportPreview({ spec, envExample, config, cases }: Props) {
  const enabled = cases.filter(c => c.enabled);
  const slug = (config.apiName || "api").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "api";
  const specName = `${slug}.spec.ts`;

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? `${label} copied` : "Could not copy");
  };

  const downloadCases = () => {
    const json = JSON.stringify({ generatedAt: new Date().toISOString(), config, cases: enabled }, null, 2);
    downloadTextFile("test-cases.json", json, "application/json");
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
      <CardContent>
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
