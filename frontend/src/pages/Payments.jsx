import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../services/api";
import {
  Loader2,
  CreditCard,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Wallet,
  Landmark,
  AlertTriangle,
  MessageCircle,
  HelpCircle,
  MapPin,
} from "lucide-react";

const fmt = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return value || "--";
  return `\u20B9${num.toLocaleString("en-IN")}`;
};

export default function Payments() {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [nbfc, setNbfc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, nbfcRes] = await Promise.all([
          paymentAPI.getSummary(),
          paymentAPI.getNBFCDetails(),
        ]);
        setSummary(summaryRes.data);
        setNbfc(nbfcRes.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load payment data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const initials = student?.name
    ? student.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">
            Loading your payment details...
          </p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-rose-500" size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Computed values
  const totalFee = parseFloat(summary?.totalProgrammeFee) || 0;
  const discount = parseFloat(summary?.discountApplied) || 0;
  const payable = parseFloat(summary?.totalFeePayable) || 0;
  const totalCovered = parseFloat(summary?.totalAmountCovered) || 0;
  const remaining = parseFloat(summary?.remainingAmountToPay) || 0;
  const paidNxtWave = parseFloat(summary?.amountPaidToNxtWave) || 0;
  const jodoFlex = parseFloat(summary?.amountPaidInFlex) || 0;
  const emiLoan = parseFloat(summary?.nbfcLoanAmountCovered) || 0;

  const hasNBFC1 = nbfc?.nbfc1?.name && nbfc.nbfc1.name.trim() !== "";
  const hasNBFC2 = nbfc?.nbfc2?.name && nbfc.nbfc2.name.trim() !== "";
  const hasAnyNBFC = hasNBFC1 || hasNBFC2;

  // Detect if an NBFC is Jodo Flex — show those in the Jodo card, not EMI card
  const isNBFC1JodoFlex = hasNBFC1 && nbfc.nbfc1.name.toLowerCase().includes("jodo");
  const isNBFC2JodoFlex = hasNBFC2 && nbfc.nbfc2.name.toLowerCase().includes("jodo");
  const hasEMINBFC = (hasNBFC1 && !isNBFC1JodoFlex) || (hasNBFC2 && !isNBFC2JodoFlex);
  const showJodoCard = jodoFlex > 0 || isNBFC1JodoFlex || isNBFC2JodoFlex;

  const statusColor = (status) => {
    if (!status) return "bg-slate-100 text-slate-600";
    const s = status.toLowerCase();
    if (s.includes("paid") || s.includes("settled") || s.includes("closed"))
      return "bg-emerald-100 text-emerald-700";
    if (s.includes("active") || s.includes("ongoing"))
      return "bg-amber-100 text-amber-700";
    if (s.includes("paused"))
      return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR (7: regular width, white, with text labels) ===== */}
      <aside
        className={`fixed top-0 left-0 h-full w-[240px] bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Logo */}
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

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm cursor-pointer"
            title="Payment Details"
          >
            <CreditCard size={18} />
            Payment Details
          </button>
        </nav>

        {/* User info + Logout */}
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-5 lg:px-8 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Menu size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Welcome Back, {student?.name}{" "}
                  <span className="inline-block">&#128075;</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-indigo-500" />
                  <span className="text-[11px] font-medium text-slate-500">
                    {summary?.productCode || "CCBP ACADEMY"},{" "}
                    {summary?.programme || "Programme"}
                  </span>
                </div>
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

        {/* Content */}
        <main className="flex-1 px-5 lg:px-8 py-3 space-y-3">
          {/* (2) EMI Info Banner — light blue */}
          {hasAnyNBFC && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
              <AlertTriangle size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">
                EMI loan details displayed here are indicative and based on
                information provided by the respective NBFC partners. For the
                most accurate and up-to-date details regarding installment
                status, prepayment options, or NOC requests, please contact your
                NBFC partner directly.
              </p>
            </div>
          )}

          {/* ===== PAYMENT SUMMARY CARD ===== */}
          <div className="bg-gradient-to-br from-[#4338ca] via-[#4f46e5] to-[#7c3aed] rounded-2xl p-4 lg:p-5 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <h3 className="text-base font-bold">Payment Summary</h3>
              </div>
              <p className="text-[11px] text-white/60 mb-3 ml-[42px]">
                Your complete fee breakdown at a glance
              </p>

              {/* Two-column layout */}
              <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                {/* LEFT: Fee details — (1) label and value in same row */}
                <div className="flex-1 max-w-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Total Programme Fee
                    </span>
                    <span className="text-lg font-black">{fmt(totalFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                        Discount Applied
                      </span>
                      <span className="text-lg font-black text-emerald-300">
                        -{fmt(discount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/15 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Total Fee Payable
                    </span>
                    <span className="text-lg font-black">{fmt(payable)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                      Total Amount Covered
                    </span>
                    <span className="text-lg font-black">{fmt(totalCovered)}</span>
                  </div>
                  <div className="border-t border-white/15 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                      Remaining Amount to Pay
                    </span>
                    <span className="text-lg font-black text-amber-300">
                      {fmt(remaining)}
                    </span>
                  </div>
                </div>

                {/* RIGHT: Breakdown sub-card */}
                <div className="lg:w-[320px] bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 self-start">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/70 mb-3">
                    Total Amount Covered - Breakdown
                  </h4>
                  <div className="space-y-2">
                    {paidNxtWave > 0 && (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-white/70 block">
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
                          <span className="text-xs text-white/70 block">
                            Jodo Flex Payments
                          </span>
                          {(() => {
                            const fs = (summary?.flexCurrentStatus || "Active").toLowerCase();
                            const isActive = fs.includes("active") || fs.includes("ongoing");
                            return (
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${isActive ? "bg-amber-500/25 text-amber-300" : "bg-emerald-500/25 text-emerald-300"}`}>
                                {summary?.flexCurrentStatus || "Active"}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-sm font-bold">{fmt(jodoFlex)}</span>
                      </div>
                    )}
                    {emiLoan > 0 && (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-white/70 block">
                            NBFC Loan Amount Covered
                          </span>
                          <span className="text-[9px] font-bold uppercase bg-emerald-500/25 text-emerald-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Covered
                          </span>
                        </div>
                        <span className="text-sm font-bold">{fmt(emiLoan)}</span>
                      </div>
                    )}

                    {/* (4) Remaining Amount to Pay + renewal date */}
                    <div className="border-t border-white/20 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          Remaining Amount to Pay
                        </span>
                        {summary?.lpoad && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                            Renewal Due
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-lg font-black text-amber-300">
                          {fmt(remaining)}
                        </span>
                        {summary?.lpoad && (
                          <span className="text-sm font-bold text-white/70">
                            {new Date(
                              new Date(summary.lpoad).setFullYear(
                                new Date(summary.lpoad).getFullYear() + 1
                              )
                            ).toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* (5) Renewal info text */}
                  <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                    <p className="text-[10px] text-white/70 leading-relaxed">
                      We will inform you before your renewal date and our team
                      will assist you through the process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== COVERED AMOUNT DETAILS ===== */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Covered Amount Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr] gap-3">
              {/* Card 1: Amount Paid to NxtWave — simple amount + status */}
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
                  <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-auto">
                    <CreditCard size={13} />
                    View Payment History
                  </button>
                </div>
              )}

              {/* Card 2: Jodo Flex Payments — includes NBFC rows if NBFC is Jodo Flex */}
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(summary?.flexCurrentStatus || "Active")}`}
                    >
                      {summary?.flexCurrentStatus || "Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Payments made through Jodo Flex
                  </p>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-3 flex-1 space-y-2">
                    {/* Jodo Flex NBFC details — vertical layout */}
                    {isNBFC1JodoFlex && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Loan Amount</span>
                          <span className="text-sm font-bold text-slate-900">{fmt(nbfc.nbfc1.loanAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Tenure</span>
                          <span className="text-sm font-bold text-slate-900">{nbfc.nbfc1.loanTenure || "--"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">EMI Amount</span>
                          <span className="text-sm font-bold text-slate-900">{fmt(nbfc.nbfc1.emiAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(nbfc.nbfc1.status)}`}>
                            {nbfc.nbfc1.status || "--"}
                          </span>
                        </div>
                      </>
                    )}
                    {isNBFC2JodoFlex && (
                      <>
                        <div className="border-t border-slate-200 pt-2.5" />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Loan Amount</span>
                          <span className="text-sm font-bold text-slate-900">{fmt(nbfc.nbfc2.loanAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Tenure</span>
                          <span className="text-sm font-bold text-slate-900">{nbfc.nbfc2.loanTenure || "--"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">EMI Amount</span>
                          <span className="text-sm font-bold text-slate-900">{fmt(nbfc.nbfc2.emiAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(nbfc.nbfc2.status)}`}>
                            {nbfc.nbfc2.status || "--"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-auto">
                    <Wallet size={13} />
                    View Payment History
                  </button>
                </div>
              )}

              {/* Card 3: EMI Loan Details — only non-Jodo-Flex NBFCs */}
              {hasEMINBFC && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                      <CreditCard size={16} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      EMI Loan Details
                    </h4>
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200">
                          <th className="text-left py-2.5 px-3">NBFC</th>
                          <th className="text-left py-2.5 px-3">Loan Amt</th>
                          <th className="text-left py-2.5 px-3">Tenure</th>
                          <th className="text-left py-2.5 px-3">EMI</th>
                          <th className="text-right py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {hasNBFC1 && !isNBFC1JodoFlex && (
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                              {nbfc.nbfc1.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-bold">
                              {fmt(nbfc.nbfc1.loanAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {nbfc.nbfc1.loanTenure || "--"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-bold">
                              {fmt(nbfc.nbfc1.emiAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(nbfc.nbfc1.status)}`}>
                                {nbfc.nbfc1.status || "--"}
                              </span>
                            </td>
                          </tr>
                        )}
                        {hasNBFC2 && !isNBFC2JodoFlex && (
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                              {nbfc.nbfc2.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-bold">
                              {fmt(nbfc.nbfc2.loanAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {nbfc.nbfc2.loanTenure || "--"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-bold">
                              {fmt(nbfc.nbfc2.emiAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(nbfc.nbfc2.status)}`}>
                                {nbfc.nbfc2.status || "--"}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-auto pt-3 leading-relaxed">
                    * This loan amount is financed to NxtWave by the respective NBFC which you would payback to the NBFC in EMIs.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ===== CONTACT SECTION ===== */}
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
                <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Contact JODO
                </button>
              </div>
            )}
            {hasEMINBFC && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <HelpCircle size={16} />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Questions about your EMI Loan?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasNBFC1 && !isNBFC1JodoFlex && (
                    <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
                      {nbfc.nbfc1.name}
                    </button>
                  )}
                  {hasNBFC2 && !isNBFC2JodoFlex && (
                    <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
                      {nbfc.nbfc2.name}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="text-center pt-1 pb-2">
            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">
              Confidential Financial Record &copy; {new Date().getFullYear()}{" "}
              NxtWave
            </p>
          </footer>
        </main>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => window.open("mailto:support@nxtwave.in")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center transition-all hover:scale-105 cursor-pointer z-50"
        title="Contact Support"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
}
