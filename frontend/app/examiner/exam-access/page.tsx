"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExaminerExamAccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/examiner");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A04A]"></div>
      <p className="text-xs text-[#6B6861]">Redirecting to Examiner Control Center...</p>
    </div>
  );
}
