import { Wallet, ArrowUpRight, ChevronRight } from "lucide-react";

export default function PaymentBreakdown({ data }) {
  if (!data) return null;

  const fmt = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value || "--";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const hasAnyRow =
    (data.amountPaidInFlex && data.amountPaidInFlex !== "0") ||
    (data.amountPaidToNxtWave && data.amountPaidToNxtWave !== "0") ||
    (data.nbfcLoanAmountCovered && data.nbfcLoanAmountCovered !== "0");

  if (!hasAnyRow) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-sm text-slate-800 tracking-tight">Payment Breakdown</h3>
        <span className="text-[9px] font-bold bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-500 uppercase tracking-widest">
          Verified Log
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-50">
              <th className="px-4 py-2">Channel</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.amountPaidInFlex && data.amountPaidInFlex !== "0" && (
              <tr>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-900 rounded-lg">
                      <Wallet size={13} />
                    </div>
                    <span className="font-bold text-slate-700 text-xs">Jodo Flex</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-black text-slate-900 text-xs">
                  {fmt(data.amountPaidInFlex)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-widest">
                    {data.flexCurrentStatus || "Active"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ChevronRight size={13} className="text-slate-300 inline" />
                </td>
              </tr>
            )}
            {data.amountPaidToNxtWave && data.amountPaidToNxtWave !== "0" && (
              <tr>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <ArrowUpRight size={13} />
                    </div>
                    <span className="font-bold text-slate-700 text-xs">Direct Pay</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-black text-slate-900 text-xs">
                  {fmt(data.amountPaidToNxtWave)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase tracking-widest">
                    Settled
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ChevronRight size={13} className="text-slate-300 inline" />
                </td>
              </tr>
            )}
            {data.nbfcLoanAmountCovered && data.nbfcLoanAmountCovered !== "0" && (
              <tr>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Wallet size={13} />
                    </div>
                    <span className="font-bold text-slate-700 text-xs">NBFC Loan</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-black text-slate-900 text-xs">
                  {fmt(data.nbfcLoanAmountCovered)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-widest">
                    Covered
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ChevronRight size={13} className="text-slate-300 inline" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
