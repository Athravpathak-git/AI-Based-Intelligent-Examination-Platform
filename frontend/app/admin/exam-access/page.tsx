"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminExamAccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E06A26]"></div>
      <p className="text-xs text-[#6B6B76]">Redirecting to Admin Command Center...</p>
    </div>
  );
}
