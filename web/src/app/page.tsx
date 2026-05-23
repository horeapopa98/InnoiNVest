import { LocationPicker } from "@/components/LocationPicker";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">InnoINVest</h1>
        <p className="text-slate-600">
          Regional data source-of-truth for NW Romania.
        </p>
      </header>
      <LocationPicker />
    </main>
  );
}
