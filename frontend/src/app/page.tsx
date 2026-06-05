import { redirect } from "next/navigation";

/**
 * Root route — the Stitch "Intelligence Hub" workspace at /sectors is
 * the canonical landing page now. Keeping the redirect (instead of
 * moving /sectors content here) preserves the sectors URL structure
 * that /sectors/macro and other deep links assume.
 */
export default function HomePage(): never {
  redirect("/sectors");
}
