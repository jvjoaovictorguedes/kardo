import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspenso?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { suspenso } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-foreground">KardoJota</h1>
        <p className="mb-6 text-sm text-muted">Entrada da equipe. Clientes entram pelo link enviado por convite.</p>
        {suspenso && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            Esse acesso foi suspenso. Fale com a Jô para liberar de novo.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
