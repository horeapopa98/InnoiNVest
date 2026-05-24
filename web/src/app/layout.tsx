import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

// One typeface for body + display. DM Sans pairs a humanist body weight
// (400/500) with sturdy display weights (600/700) so it carries both the
// data-dense KPI tiles and the pitch-deck hero headlines without needing a
// second family.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InnoiNVest Intelligence",
  description:
    "Institutional-grade investment intelligence for regional markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // We render `light` ourselves so the class is present on the server
    // and the client; otherwise extensions like Phantom wallet, Dark
    // Reader, and MetaMask race to inject it during hydration, which
    // triggers a mismatch warning AND breaks any CSS that depends on
    // the class being present from the first paint.
    //
    // suppressHydrationWarning silences any further extension-induced
    // attribute mutations on <html> / <body> (data-grammarly, etc.).
    <html
      lang="en"
      className={`light ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="font-body-md text-on-surface antialiased"
      >
        {children}
      </body>
    </html>
  );
}
