"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function ExportButtons({ siruta }: { siruta: string }) {
  return (
    <div className="flex gap-2">
      <a href={`${BASE}/report/${siruta}/export.csv`} download>
        <Button variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </a>
      <a href={`${BASE}/report/${siruta}/export.docx`} download>
        <Button variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" /> Export Word
        </Button>
      </a>
    </div>
  );
}
