import { useEffect, useState } from "react";
import { Landing } from "@/components/Landing";
import { Workspace } from "@/components/Workspace";
import { loadProject } from "@/lib/storage";

const Index = () => {
  const [view, setView] = useState<"landing" | "workspace">("landing");
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    document.title = "API TestForge — Playwright API test generator";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Paste one sample API request and generate a production-ready Playwright .spec.ts file with positive, negative, boundary, security, and auth coverage.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
    setHasDraft(!!loadProject());
  }, []);

  if (view === "workspace") {
    return <Workspace onExit={() => setView("landing")} />;
  }

  return <Landing onStart={() => setView("workspace")} hasDraft={hasDraft} />;
};

export default Index;
