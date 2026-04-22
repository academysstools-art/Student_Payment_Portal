import { CheckCircle, Receipt } from "lucide-react";

export default function PaymentSummary({ data }) {
  if (!data) return null;

  const fmt = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value || "--";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const totalFee = parseFloat(data.totalFeePayable) || 0;
  const totalCovered = parseFloat(data.totalAmountCovered) || 0;
  const progressPercent = totalFee > 0 ? (totalCovered / totalFee) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Fee Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total Programme Fee
          </p>
          <p className="text-lg font-black text-slate-900">{fmt(data.totalProgrammeFee)}</p>
          {data.discountApplied && data.discountApplied !== "0" && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
              <CheckCircle size={10} /> Discount: {fmt(data.discountApplied)}
            </div>
          )}
        </div>

        <div className="bg-blue-900 p-3 rounded-xl shadow-lg shadow-blue-100 text-white md:col-span-2 relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5 text-blue-100">
                Net Fee Payable
              </p>
              <p className="text-xl font-black tracking-tighter">{fmt(data.totalFeePayable)}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <p className="text-[9px] font-bold uppercase opacity-70 mb-0.5">Total Covered</p>
                <p className="font-black text-sm">{fmt(data.totalAmountCovered)}</p>
              </div>
              <div className="bg-rose-500 px-3 py-1.5 rounded-xl shadow-lg border border-rose-400">
                <p className="text-[9px] font-bold uppercase opacity-80 mb-0.5">Remaining Due</p>
                <p className="font-black text-white text-sm">{fmt(data.remainingAmountToPay)}</p>
              </div>
            </div>
          </div>
          <Receipt className="absolute -right-3 -bottom-3 w-20 h-20 text-blue-700 opacity-50 rotate-12" />
        </div>
      </div>

      {/* Compact Collection Progress */}
      <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          Paid
        </span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full relative">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-900 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <span className="text-xs font-black text-blue-900 tracking-tighter whitespace-nowrap">
          {progressPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
