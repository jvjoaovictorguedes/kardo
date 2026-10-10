"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ConviteAutoLogin({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    signIn("client-invite", { token, redirect: false }).then((result) => {
      if (cancelled) return;
      if (result?.error) {
        setError("Esse link de convite já foi usado, expirou, ou o acesso foi suspenso. Peça um novo link à Jô.");
        return;
      }
      router.push("/");
      router.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (error) {
    return <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>;
  }

  return (
    <div className="flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
