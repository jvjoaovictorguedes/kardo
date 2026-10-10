import { ConviteAutoLogin } from "./convite-auto-login";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-foreground">KardoJota</h1>
        <p className="mb-6 text-sm text-muted">Entrando no seu espaço...</p>
        <ConviteAutoLogin token={token} />
      </div>
    </div>
  );
}
