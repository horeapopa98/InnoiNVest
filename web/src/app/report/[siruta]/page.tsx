import { notFound } from "next/navigation";
import { getFlatReport, getGroupedReport } from "@/lib/api";
import { ReportView } from "@/components/ReportView";

type Props = { params: Promise<{ siruta: string }> };

export default async function ReportPage({ params }: Props) {
  const { siruta } = await params;
  try {
    const [grouped, flat] = await Promise.all([
      getGroupedReport(siruta),
      getFlatReport(siruta),
    ]);
    return (
      <main className="mx-auto max-w-4xl p-8">
        <ReportView grouped={grouped} flat={flat} />
      </main>
    );
  } catch {
    notFound();
  }
}
