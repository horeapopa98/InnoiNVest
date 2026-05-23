"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/stitch/TopNav";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { readStorage } from "@/lib/persistence/storage";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import {
  SEED_TEMPLATES,
  type GeneratedReport,
  type ReportTemplate,
} from "@/lib/mock/templates";

type Props = { params: Promise<{ reportId: string }> };

export default function GeneratedReportPage({ params }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { reportId } = await params;
      const reports = readStorage<GeneratedReport[]>(STORAGE_KEYS.reports, []);
      const r = reports.find((x) => x.id === reportId);
      if (!r) {
        setLoaded(true);
        return;
      }
      const userTemplates = readStorage<ReportTemplate[]>(STORAGE_KEYS.templates, []);
      const t =
        userTemplates.find((x) => x.id === r.templateId) ??
        SEED_TEMPLATES.find((x) => x.id === r.templateId) ??
        SEED_TEMPLATES[0];
      setReport(r);
      setTemplate(t);
      setLoaded(true);
    })();
  }, [params]);

  if (loaded && !report) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="flex-1 px-6 py-8">
        {report && template && (
          <ReportPreview
            report={report}
            template={template}
            onBack={() => router.push("/reports")}
          />
        )}
      </main>
    </div>
  );
}
