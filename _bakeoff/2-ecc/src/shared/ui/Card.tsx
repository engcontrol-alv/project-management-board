import type { ReactNode } from 'react';

export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`tb-card ${className}`}>
      {title && !actions && <h3>{title}</h3>}
      {title && actions && (
        <div className="tb-card-head">
          <h3>{title}</h3>
          <div className="tb-row">{actions}</div>
        </div>
      )}
      {children}
    </section>
  );
}
