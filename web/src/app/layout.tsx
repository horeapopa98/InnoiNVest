import type { Metadata } from "next";
import { Open_Sans, Raleway } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${openSans.variable} ${raleway.variable} font-body-md text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
