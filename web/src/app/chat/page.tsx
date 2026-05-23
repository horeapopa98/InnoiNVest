import { TopNav } from "@/components/stitch/TopNav";

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-margin-desktop py-12">
        <h1 className="font-headline-lg text-headline-lg">Chat</h1>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          Coming next: ask anything about the data.
        </p>
      </main>
    </div>
  );
}
