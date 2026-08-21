"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccess } from "../lib/api";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getAccess() ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
