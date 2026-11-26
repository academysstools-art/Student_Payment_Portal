import { useState } from "react";
import PaymentHistoryModal from "./PaymentHistoryModal";
import {
  CreditCard,
  TrendingUp,
  Wallet,
  Landmark,
  AlertTriangle,
  MessageCircle,
  HelpCircle,
  MapPin,
  Info,
  LogOut,
} from "lucide-react";

const fmt = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return value || "--";
  return `\u20B9${num.toLocaleString("en-IN")}`;
};

const statusColor = (status) => {
  if (!status) return "bg-slate-100 text-slate-600";
  const s = status.toLowerCase();
  if (
    s.includes("paid") ||
    s.includes("settled") ||
    s.includes("closed") ||
    s.includes("completed")
  )
    return "bg-emerald-100 text-emerald-700";
  if (s.includes("active") || s.includes("ongoing"))
    return "bg-amber-100 text-amber-700";
  if (s.includes("paused")) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
};

/**
 * Exact student payment portal UI (read-only) for admin preview.
 * Props match what /payments loads from the student APIs.
 */
export default function StudentPortalPreview({ portal }) {
  const student = portal?.student || {};
  const summary = portal?.summary || {};
  const nbfcGroups = portal?.nbfcGroups || [];
  const nbfcContacts = portal?.contacts || [];
  const companyLogs = portal?.companyLogs || [];
  const flexLogs = portal?.flexLogs || [];

  const [companyLogsModal, setCompanyLogsModal] = useState(false);
  const [flexLogsModal, setFlexLogsModal] = useState(false);

  const totalFee = parseFloat(summary?.totalProgrammeFee) || 0;
  const discount = parseFloat(summary?.discountApplied) || 0;
  const payable = parseFloat(summary?.totalFeePayable) || 0;
  const totalCovered = parseFloat(summary?.totalAmountCovered) || 0;
  const remaining = parseFloat(summary?.remainingAmountToPay) || 0;
  const paidNxtWave = parseFloat(summary?.amountPaidToNxtWave) || 0;
  const jodoFlex = parseFloat(summary?.amountPaidInFlex) || 0;
  const emiLoan = parseFloat(summary?.nbfcLoanAmountCovered) || 0;

  const hasAnyNBFC = nbfcGroups.length > 0;
  const emiGroups = nbfcGroups.filter(
    (g) => !g.nbfcName.toLowerCase().includes("jodo")
  );
  const hasEMINBFC = emiGroups.length > 0;
  const showJodoCard = jodoFlex > 0;

  const latestDueDate = (() => {
    const allDueDates = nbfcGroups
      .flatMap((g) => g.rows)
      .map((r) => r.dueDate)
      .filter(Boolean)
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));
    if (allDueDates.length === 0) return null;
    return allDueDates.reduce((latest, d) => (d > latest ? d : latest));
  })();

  const initials = student?.name
    ? student.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="bg-[#f5f6fa] flex h-full min-h-[calc(100vh-56px)] overflow-hidden relative">
      <aside className="hidden md:flex w-[220px] shrink-0 bg-white border-r border-slate-200 flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900">
                NxtWave
              </h1>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">
                Payment Portal
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm">
            <CreditCard size={18} />
            Payment Details
          </div>
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 font-semibold text-sm">
            <MessageCircle size={18} />
            Feedback
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {student?.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {summary?.programme || "Student"}
              </p>
            </div>
          </div>
          <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold">
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-5 lg:px-8 py-2.5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Welcome Back, {student?.name}{" "}
                <span className="inline-block">&#128075;</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-indigo-500" />
                <span className="text-[11px] font-medium text-slate-500">
                  {summary?.programme || "Programme"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 hidden sm:block">
                {student?.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-3 space-y-3">
          {hasAnyNBFC && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
              <AlertTriangle
                size={15}
                className="text-blue-500 mt-0.5 shrink-0"
              />
              <p className="text-xs text-blue-800 leading-relaxed">
                EMI loan details displayed here are indicative and based on
                information provided by the respective NBFC partners. For the
                most accurate and up-to-date details regarding installment
                status, prepayment options, or NOC requests, please contact your
                NBFC partner directly.
              </p>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#4338ca] via-[#4f46e5] to-[#7c3aed] rounded-2xl p-4 lg:p-5 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 max-w-sm">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                  <h3 className="text-base font-bold">Payment Summary</h3>
                </div>
                <p className="text-[11px] text-white/60 mb-3 ml-[42px]">
                  Your complete fee breakdown at a glance
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                      Total Programme Fee
                    </span>
                    <span className="text-lg font-black">{fmt(totalFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                        Discount Applied
                      </span>
                      <span className="text-lg font-black text-white">
                        -{fmt(discount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/15 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                      Total Fee Payable
                    </span>
                    <span className="text-lg font-black">{fmt(payable)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white flex items-center gap-1">
                      Total Amount Covered
                      <Info size={11} className="text-white/50" />
                    </span>
                    <span className="text-lg font-black">{fmt(totalCovered)}</span>
                  </div>
                  <div className="border-t border-white/15 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1">
                      Remaining Amount to Pay
                      <Info size={11} className="text-white/50" />
                    </span>
                    <span className="text-lg font-black text-amber-300">
                      {fmt(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:w-[320px] bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 self-start">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">
                  Total Amount Covered - Breakdown
                </h4>
                <div className="space-y-2">
                  {paidNxtWave > 0 && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-white/90 block">
                          Amount Paid to NxtWave
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Paid
                        </span>
                      </div>
                      <span className="text-sm font-bold">{fmt(paidNxtWave)}</span>
                    </div>
                  )}
                  {jodoFlex > 0 && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-white/90 block">
                          Jodo Flex Payments
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Paid
                        </span>
                      </div>
                      <span className="text-sm font-bold">{fmt(jodoFlex)}</span>
                    </div>
                  )}
                  {emiLoan > 0 && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-white/90 block">
                          NBFC Loan Amount Covered
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Covered
                        </span>
                      </div>
                      <span className="text-sm font-bold">{fmt(emiLoan)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/20 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                        Remaining Amount to Pay
                      </span>
                      {latestDueDate && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                          Due starts from
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-lg font-black text-amber-300">
                        {fmt(remaining)}
                      </span>
                      {latestDueDate && (
                        <span className="text-sm font-bold text-white/70">
                          {latestDueDate.toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                  <p className="text-[10px] text-white/90 leading-relaxed">
                    We will remind you in advance about your remaining due
                    amount, and our team will guide you further.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Covered Amount Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr] gap-3">
              {paidNxtWave > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                        <Landmark size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Amount Paid to NxtWave
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      Paid
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Direct amount paid to NxtWave
                  </p>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-3 flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                      Total Amount Paid
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {fmt(paidNxtWave)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompanyLogsModal(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
                  >
                    <CreditCard size={13} />
                    View Payment History
                  </button>
                </div>
              )}

              {showJodoCard && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <Wallet size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Jodo Flex Payments
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      Paid
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Payments made through Jodo Flex
                  </p>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-3 flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                      Total Amount Paid
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      {fmt(jodoFlex)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlexLogsModal(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
                  >
                    <Wallet size={13} />
                    View Payment History
                  </button>
                </div>
              )}

              {hasEMINBFC && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                        <CreditCard size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        EMI Loan Details
                      </h4>
                    </div>
                    {emiGroups.some((g) =>
                      g.rows.some((r) => r.status?.toLowerCase() === "active")
                    ) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                        Repaying
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200">
                          <th className="text-left py-2.5 px-3">NBFC</th>
                          <th className="text-left py-2.5 px-3">Total Loan</th>
                          <th className="text-left py-2.5 px-3">EMI Amt</th>
                          <th className="text-left py-2.5 px-3">Tenure</th>
                          <th className="text-right py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {emiGroups.flatMap((group) =>
                          group.rows.map((row, idx) => (
                            <tr key={`${group.nbfcName}-${idx}`}>
                              <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                                {group.nbfcName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 font-bold">
                                {fmt(row.loanAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 font-bold">
                                {fmt(row.emiAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                <span className="block">{row.tenure || row.tenureRange || "--"}</span>
                                {row.tenure && row.tenureRange && (
                                  <span className="block text-[10px] text-slate-400">{row.tenureRange}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(row.status)}`}
                                >
                                  {row.status || "--"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Note: This loan amount is financed to NxtWave by the
                    respective NBFC, which you would pay back to the NBFC in
                    EMI&apos;s.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {showJodoCard && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <HelpCircle size={16} />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Questions about JODO Flex?
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">
                  Contact JODO
                </span>
              </div>
            )}
            {hasEMINBFC && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <HelpCircle size={16} />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Questions about your EMI Loan?
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {emiGroups.map((group) => {
                    const contact = nbfcContacts.find(
                      (c) =>
                        c.nbfcName.toLowerCase() ===
                        group.nbfcName.toLowerCase()
                    );
                    return (
                      <span
                        key={group.nbfcName}
                        title={contact?.email || ""}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        {group.nbfcName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <footer className="text-center pt-1 pb-2">
            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">
              Confidential Financial Record &copy; {new Date().getFullYear()}{" "}
              NxtWave
            </p>
          </footer>
        </main>
      </div>

      <PaymentHistoryModal
        isOpen={companyLogsModal}
        onClose={() => setCompanyLogsModal(false)}
        title="NxtWave Payment History"
        loading={false}
        columns={[
          { key: "paidDate", label: "Date" },
          { key: "paidAmount", label: "Amount", isAmount: true },
          { key: "paymentStatus", label: "Status", isStatus: true },
        ]}
        data={companyLogs}
      />

      <PaymentHistoryModal
        isOpen={flexLogsModal}
        onClose={() => setFlexLogsModal(false)}
        title="Jodo Flex Payment History"
        loading={false}
        columns={[
          { key: "paidDate", label: "Date" },
          { key: "paidAmount", label: "Amount", isAmount: true },
          { key: "paymentStatus", label: "Status", isStatus: true },
          { key: "paymentMode", label: "Mode" },
        ]}
        data={flexLogs}
      />
    </div>
  );
}
