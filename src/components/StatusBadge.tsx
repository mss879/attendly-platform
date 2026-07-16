import type { PaymentStatus } from "@/lib/types";

const styles: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: "Awaiting payment",
    className: "bg-amber-100/80 text-amber-700",
  },
  slip_uploaded: {
    label: "Slip under review",
    className: "bg-sky-100/80 text-sky-700",
  },
  verified: {
    label: "Payment verified",
    className: "bg-emerald-100/80 text-emerald-700",
  },
  rejected: {
    label: "Slip rejected",
    className: "bg-red-100/80 text-red-700",
  },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
