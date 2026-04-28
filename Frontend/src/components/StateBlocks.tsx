import type { ReactNode } from "react";

type StateBlockProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: StateBlockProps) {
  return (
    <section className="state-block empty-state">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function ErrorState({ title, children }: StateBlockProps) {
  return (
    <section className="state-block error-state" role="alert">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function LoadingState({ title = "読み込み中" }: Partial<StateBlockProps>) {
  return (
    <section className="state-block loading-state" aria-live="polite">
      <span className="loading-dot" />
      <h2>{title}</h2>
    </section>
  );
}
