import { Suspense } from "react";
import RiderPortal from "@/src/components/RiderPortal";

export const dynamic = "force-static";

export default function RiderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070A10] text-slate-400 flex items-center justify-center font-mono text-sm">
          Loading Rider Portal...
        </div>
      }
    >
      <RiderPortal />
    </Suspense>
  );
}
