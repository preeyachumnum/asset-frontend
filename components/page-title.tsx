import { ReactNode } from "react";

type PageTitleProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}
