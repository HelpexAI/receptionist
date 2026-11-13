import { Suspense } from "react";
import PosOrderTaking from "@/src/components/PosOrderTaking";

export const dynamic = "force-static";

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070A10] text-slate-400 flex items-center justify-center font-mono text-sm">
          Loading POS Terminal...
        </div>
      }
    >
      <PosOrderTaking />
    </Suspense>
  );
}
