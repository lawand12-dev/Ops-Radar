import * as React from "react";
import { cn } from "<npm>/lib/utils";

type Density = "spacious" | "medium" | "dense";

const ROW_PADDING: Record<Density, string> = {
  spacious: "py-5 px-6",
  medium: "py-3.5 px-5",
  dense: "py-2 px-4",
};

const HEAD_PADDING: Record<Density, string> = {
  spacious: "py-3 px-6",
  medium: "py-2.5 px-5",
  dense: "py-2 px-4",
};

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  density?: Density;
}

function Table({ className, density = "medium", ...props }: TableProps) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]", className)}>
      <table
        data-slot="table"
        data-density={density}
        className="w-full border-collapse text-left"
        {...props}
      />
    </div>
  );
}

function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      data-slot="thead"
      className={cn("border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]", className)}
      {...props}
    />
  );
}

function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      data-slot="tr"
      className={cn(
        "border-t border-[var(--color-border)] first:border-t-0 transition-colors hover:bg-[var(--color-surface-sunken)]/50",
        className,
      )}
      {...props}
    />
  );
}

interface CellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  density?: Density;
}

function TH({ className, density = "medium", ...props }: CellProps) {
  return (
    <th
      data-slot="th"
      className={cn(
        "text-label font-medium text-[var(--color-fg-subtle)]",
        HEAD_PADDING[density],
        className,
      )}
      {...props}
    />
  );
}

function TD({ className, density = "medium", ...props }: CellProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      data-slot="td"
      className={cn(
        "align-middle text-body-sm text-[var(--color-fg)]",
        ROW_PADDING[density],
        className,
      )}
      {...props}
    />
  );
}

export { Table, THead, TR, TH, TD, type Density, type TableProps };
