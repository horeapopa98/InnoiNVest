"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { FlatRow } from "@/lib/api";
import { citation, formatValue } from "@/lib/format";

export function FlatTable({ rows }: { rows: FlatRow[] }) {
  const columns = useMemo<ColumnDef<FlatRow>[]>(() => [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "kpi_name_en", header: "KPI" },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => formatValue(row.original.value, row.original.unit),
    },
    { accessorKey: "period", header: "Year" },
    {
      accessorKey: "source_code",
      header: "Source",
      cell: ({ row }) =>
        `${row.original.source_code.toUpperCase()}${
          row.original.source_dataset_id ? ` ${row.original.source_dataset_id}` : ""
        }`,
    },
    {
      id: "copy",
      header: "",
      cell: ({ row }) => (
        <Button size="icon" variant="ghost" onClick={() =>
          navigator.clipboard.writeText(citation(
            row.original.unit, row.original.value, row.original.period,
            row.original.source_code, row.original.source_dataset_id
          ))
        }>
          <Copy className="h-4 w-4" />
        </Button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <table className="w-full text-sm">
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id} className="border-b text-left">
            {hg.headers.map((h) => (
              <th key={h.id} className="py-2 pr-4">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((r) => (
          <tr key={r.id} className="border-b">
            {r.getVisibleCells().map((c) => (
              <td key={c.id} className="py-2 pr-4">
                {flexRender(c.column.columnDef.cell, c.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
