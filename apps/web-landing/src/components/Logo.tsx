import Image from "next/image";
import { cn } from "@/ui";

/** Vertofi wordmark with actual brand logo asset. */
export function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Vertofi home">
      <Image
        src="/logo.jpg"
        alt="Vertofi"
        width={32}
        height={32}
        className="rounded-lg object-contain"
        priority
      />
      <span className="text-[17px] font-bold tracking-tight text-[#0F172A]">Vertofi</span>
    </a>
  );
}
