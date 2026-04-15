"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[50vh] items-center justify-center py-16">
      <div className="max-w-lg rounded-[32px] border border-rose-400/20 bg-rose-400/10 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-rose-200/70">Interface error</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">The operator console hit an unexpected fault.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-200">
          Reset the route to reload the demo surface. The mock-safe architecture keeps the overall flow easy to recover.
        </p>
        <Button className="mt-6" onClick={reset}>
          Reset page
        </Button>
      </div>
    </div>
  );
}
