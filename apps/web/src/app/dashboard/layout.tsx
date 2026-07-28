"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHydrated } from "@/lib/use-hydrated";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token } = useAuth();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return null;
  }

  return <>{children}</>;
}
