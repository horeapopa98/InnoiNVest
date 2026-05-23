"use client";

import { useState } from "react";
import { TopNav } from "@/components/stitch/TopNav";
import { TemplateLibrary } from "@/components/reports/TemplateLibrary";
import { TemplateCanvas } from "@/components/reports/TemplateCanvas";
import { VariablesPicker } from "@/components/reports/VariablesPicker";
import { SystemClock } from "@/components/reports/SystemClock";
import { createStandardTemplate, type ReportTemplate } from "@/lib/mock/templates";

export default function ReportsPage() {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate>(
    createStandardTemplate()
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[16rem_1fr_18rem]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <TemplateLibrary
            activeId={activeTemplate.id}
            onSelect={setActiveTemplate}
          />
        </aside>
        <main className="min-w-0 overflow-y-auto bg-background px-6 py-8">
          <TemplateCanvas
            template={activeTemplate}
            onChange={setActiveTemplate}
          />
        </main>
        <aside className="hidden border-l border-border-subtle bg-surface lg:block">
          <VariablesPicker />
        </aside>
      </div>
      <SystemClock />
    </div>
  );
}
