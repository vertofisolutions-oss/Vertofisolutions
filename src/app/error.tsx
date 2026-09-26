"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900 rounded-xl m-6 border border-slate-200">
      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4 font-bold text-xl">
        !
      </div>
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
        {error?.message || "An unexpected error occurred while rendering this component."}
      </p>
      <button
        onClick={() => reset()}
        className="py-2 px-6 bg-brand hover:bg-brand/90 text-white font-semibold rounded-lg shadow-sm transition"
      >
        Try Again
      </button>
    </div>
  );
}
