import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, KeyRound, RotateCcw, FileJson } from "lucide-react";
import type { RequestConfig, AuthMode, HttpMethod, TestDepth } from "@/lib/types";
import { DEFAULT_PAYLOAD } from "@/lib/storage";
import { safeParseJson } from "@/lib/analyzer";
import { useMemo } from "react";

interface Props {
  config: RequestConfig;
  onChange: (c: RequestConfig) => void;
  onReset: () => void;
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const METHOD_TONES: Record<HttpMethod, string> = {
  GET: "text-success",
  POST: "text-accent",
  PUT: "text-warning",
  PATCH: "text-category-format",
  DELETE: "text-destructive",
};

export function RequestSetupForm({ config, onChange, onReset }: Props) {
  const update = (patch: Partial<RequestConfig>) => onChange({ ...config, ...patch });

  const jsonError = useMemo(() => {
    if (!config.bodyJson.trim()) return null;
    const r = safeParseJson(config.bodyJson);
    if (r.ok) return null;
    return r.error;
  }, [config.bodyJson]);

  return (
    <div className="space-y-6">
      <Card className="shadow-elev-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Request setup</CardTitle>
              <CardDescription>Define the API call you want to test.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>API name</Label>
              <Input
                value={config.apiName}
                onChange={e => update({ apiName: e.target.value })}
                placeholder="Create User"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Test depth</Label>
              <Select value={config.testDepth} onValueChange={(v: TestDepth) => update({ testDepth: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — quick smoke coverage</SelectItem>
                  <SelectItem value="standard">Standard — recommended</SelectItem>
                  <SelectItem value="aggressive">Aggressive — deep edge cases</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-3">
              <Label>Method</Label>
              <Select value={config.method} onValueChange={(v: HttpMethod) => update({ method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m} value={m}>
                      <span className={`font-mono font-semibold ${METHOD_TONES[m]}`}>{m}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label>Base URL</Label>
              <Input
                value={config.baseUrl}
                onChange={e => update({ baseUrl: e.target.value })}
                placeholder="https://api.example.com"
                className="font-mono text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label>Endpoint</Label>
              <Input
                value={config.endpoint}
                onChange={e => update({ endpoint: e.target.value })}
                placeholder="/users"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Expected success status</Label>
              <Input
                type="number"
                value={config.expectedSuccessStatus}
                onChange={e => update({ expectedSuccessStatus: Number(e.target.value) || 200 })}
              />
            </div>
            <div>
              <Label>Expected validation status</Label>
              <Input
                type="number"
                value={config.expectedValidationStatus}
                onChange={e => update({ expectedValidationStatus: Number(e.target.value) || 400 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <HeaderEditor
        headers={config.headers}
        onChange={(headers) => update({ headers })}
      />

      <AuthSection auth={config.auth} onChange={(auth) => update({ auth })} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Body payload</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => update({ bodyJson: DEFAULT_PAYLOAD })}>
              Load sample
            </Button>
          </div>
          <CardDescription>Paste a representative JSON payload — TestForge analyzes it to infer fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.bodyJson}
            onChange={e => update({ bodyJson: e.target.value })}
            spellCheck={false}
            rows={12}
            className="font-mono text-sm leading-relaxed bg-muted/40"
            placeholder='{ "name": "John" }'
          />
          {jsonError && (
            <p className="mt-2 text-sm text-destructive font-mono">JSON error: {jsonError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderEditor({ headers, onChange }: { headers: RequestConfig["headers"]; onChange: (h: RequestConfig["headers"]) => void }) {
  const update = (i: number, patch: Partial<RequestConfig["headers"][number]>) => {
    const next = headers.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...headers, { key: "", value: "", enabled: true }]);
  const remove = (i: number) => onChange(headers.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Headers</CardTitle>
        <CardDescription>Custom headers sent with every test case (Content-Type is added automatically).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {headers.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No headers — the request will use defaults.</p>
        )}
        {headers.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={e => update(i, { enabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <Input
              value={h.key}
              onChange={e => update(i, { key: e.target.value })}
              placeholder="Header name"
              className="font-mono text-sm"
            />
            <Input
              value={h.value}
              onChange={e => update(i, { value: e.target.value })}
              placeholder="Value"
              className="font-mono text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove header">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4 mr-1" /> Add header
        </Button>
      </CardContent>
    </Card>
  );
}

function AuthSection({ auth, onChange }: { auth: RequestConfig["auth"]; onChange: (a: RequestConfig["auth"]) => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Authentication</CardTitle>
        </div>
        <CardDescription>Bearer tokens are referenced via env variables in the generated spec — never hardcoded.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={auth.mode} onValueChange={(v: AuthMode) => onChange({ ...auth, mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="staticBearer">Static Bearer Token (still uses env)</SelectItem>
            <SelectItem value="envBearer">Env Bearer Token (recommended)</SelectItem>
            <SelectItem value="loginApi">Login API placeholder</SelectItem>
          </SelectContent>
        </Select>

        {(auth.mode === "envBearer" || auth.mode === "staticBearer") && (
          <div>
            <Label>Env variable name</Label>
            <Input
              value={auth.envVarName ?? "API_TOKEN"}
              onChange={e => onChange({ ...auth, envVarName: e.target.value })}
              className="font-mono text-sm"
              placeholder="API_TOKEN"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The generated spec reads <code className="font-mono">process.env.{auth.envVarName || "API_TOKEN"}</code>.
            </p>
          </div>
        )}

        {auth.mode === "loginApi" && (
          <p className="text-sm text-muted-foreground">
            Login API hook is a placeholder — adapt the generated <code className="font-mono">applyHeadersOverride</code> helper to call your login endpoint.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
