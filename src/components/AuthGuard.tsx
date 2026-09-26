"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        setAuthed(false);
        const returnUrl = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?returnUrl=${returnUrl}`);
        return;
      }
      setAuthed(true);
    };

    checkAuth();
    window.addEventListener("vertofi:auth-changed", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("vertofi:auth-changed", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [router, pathname]);

  if (authed === null || authed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
