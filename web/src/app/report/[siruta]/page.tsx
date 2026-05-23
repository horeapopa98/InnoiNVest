import { notFound } from "next/navigation";
import { getFlatReport, getGroupedReport } from "@/lib/api";
import { ReportView } from "@/components/ReportView";

type Props = { params: Promise<{ siruta: string }> };

export default async function ReportPage({ params }: Props) {
  const { siruta } = await params;
  let grouped, flat;
  try {
    [grouped, flat] = await Promise.all([
      getGroupedReport(siruta),
      getFlatReport(siruta),
    ]);
  } catch (e) {
    // Render the actual error instead of swallowing it as 404 — much easier to debug.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("404")) notFound();
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-xl font-semibold">Error loading report for {siruta}</h1>
        <pre className="mt-4 whitespace-pre-wrap rounded bg-red-50 p-4 text-sm text-red-800">{msg}</pre>
        <p className="mt-4 text-sm text-slate-600">
          Check that the API is running at <code>http://localhost:8000</code> and that
          <code> innoinvest seed && innoinvest ingest</code> has been run.
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl p-8">
      <ReportView grouped={grouped} flat={flat} />
    </main>
  );
}
