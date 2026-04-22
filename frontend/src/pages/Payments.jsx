import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PaymentSummary from "../components/PaymentSummary";
import PaymentBreakdown from "../components/PaymentBreakdown";
import PaymentCalculator from "../components/PaymentCalculator";
import NBFCDetails from "../components/NBFCDetails";
import { paymentAPI } from "../services/api";
import { Loader2, Info, ShieldCheck, Send, CheckCircle } from "lucide-react";

export default function Payments() {
  const [summary, setSummary] = useState(null);
  const [nbfc, setNbfc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-900 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-sm tracking-tighter">
            AUTHENTICATING LEDGER...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-center font-bold text-sm border border-rose-100">
            {error}
          </div>
        </div>
      </>
    );
  }

  const hasNBFC =
    nbfc &&
    ((nbfc.nbfc1?.name && nbfc.nbfc1.name.trim() !== "") ||
      (nbfc.nbfc2?.name && nbfc.nbfc2.name.trim() !== "") ||
      nbfc.currentNBFC);

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-blue-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-xl font-black tracking-tight text-slate-900 mb-0.5">
            Payment Details
          </h1>
          <p className="text-slate-400 font-medium text-xs">
            Fee structure, coverage &amp; financing overview
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-4">
            <PaymentSummary data={summary} />
            {hasNBFC && <NBFCDetails data={nbfc} />}
            <PaymentBreakdown data={summary} />
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-3">
            {/* Account Status */}
            <div className="bg-slate-900 p-4 rounded-xl text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Account Status
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Programme
                    </p>
                    <p className="font-black text-sm tracking-tight">
                      {summary?.programme}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Payment Plan
                    </p>
                    <p className="text-xs font-medium text-slate-300">
                      {summary?.paymentPlanType || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                      Product Status
                    </p>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase tracking-widest">
                      {summary?.productStatus || "--"}
                    </span>
                  </div>
                </div>
              </div>
              <ShieldCheck
                size={80}
                className="absolute -right-6 -top-6 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            {/* Calculator */}
            <PaymentCalculator />

            {/* Feedback / Support */}
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="text-blue-900 shrink-0" size={13} />
                <p className="text-[10px] font-bold text-blue-900">
                  Have a query or need help?
                </p>
              </div>
              {feedbackSent ? (
                <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold">
                  <CheckCircle size={13} /> Feedback submitted successfully!
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!feedbackMsg.trim()) return;
                    setFeedbackSending(true);
                    try {
                      await paymentAPI.submitFeedback(feedbackMsg.trim());
                      setFeedbackSent(true);
                      setFeedbackMsg("");
                      setTimeout(() => setFeedbackSent(false), 3000);
                    } catch {
                      // silent fail
                    }
                    setFeedbackSending(false);
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Type your query..."
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    disabled={feedbackSending}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-blue-300 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={feedbackSending || !feedbackMsg.trim()}
                    className="p-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={12} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-slate-100 text-center pb-4">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Confidential Financial Record &copy; {new Date().getFullYear()} NxtWave
          </p>
        </footer>
      </main>
    </div>
  );
}
