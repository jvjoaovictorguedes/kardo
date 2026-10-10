export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="text-3xl">🚧</span>
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      <p className="text-sm text-muted">Esse módulo ainda está sendo construído. Já volto com ele.</p>
    </div>
  );
}
