import { useState, useEffect } from "react";
import AdminNavbar from "../components/AdminNavbar";
import { adminAPI } from "../services/api";
import {
  BarChart3, Search, MessageSquare, Download,
  Loader2, Users, Activity, Clock, ChevronRight, X,
} from "lucide-react";

const TABS = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "students", label: "Student Lookup", icon: Search },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "export", label: "Export", icon: Download },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("analytics");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "analytics" && <AnalyticsTab />}
        {tab === "students" && <StudentsTab />}
        {tab === "feedback" && <FeedbackTab />}
        {tab === "export" && <ExportTab />}
      </main>
    </div>
  );
}

/* ─── Analytics Tab ─── */
function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics().then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <Empty text="Failed to load analytics" />;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Total Logins" value={data.totalLogins} color="blue" />
        <StatCard icon={Users} label="Unique Students" value={data.uniqueStudents} color="emerald" />
        <StatCard icon={Clock} label="Last Login" value={
          data.recentLogins.length > 0
            ? new Date(data.recentLogins[0].timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
            : "None"
        } color="amber" />
      </div>

      {/* Recent Logins Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <h3 className="font-black text-sm text-slate-800">Recent Student Logins</h3>
        </div>
        {data.recentLogins.length === 0 ? (
          <p className="p-4 text-xs text-slate-400">No logins recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Programme</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentLogins.map((log, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-xs font-black text-blue-900">{log.userId}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-700">{log.name}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{log.programme}</td>
                    <td className="px-4 py-2 text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Students Tab ─── */
function StudentsTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSelected(null);
    try {
      const res = await adminAPI.searchStudents(query.trim());
      setResults(res.data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }

  async function viewDetails(userId) {
    setDetailLoading(true);
    try {
      const res = await adminAPI.getStudentDetails(userId);
      setSelected(res.data);
    } catch {
      setSelected(null);
    }
    setDetailLoading(false);
  }

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? v || "--" : `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search by User ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Results */}
      {results.length > 0 && !selected && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Programme</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Remaining</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((s) => (
                  <tr key={s.userId}>
                    <td className="px-4 py-2.5 text-xs font-black text-blue-900">{s.userId}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{s.programme}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
                        {s.productStatus || "--"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-black text-slate-900">{fmt(s.remainingAmountToPay)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => viewDetails(s.userId)}
                        className="text-blue-900 hover:text-blue-700 cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail View */}
      {detailLoading && <Spinner />}
      {selected && !detailLoading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-sm text-slate-800">
              {selected.userId}
            </h3>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DetailItem label="Programme" value={selected.programme} />
              <DetailItem label="Product Code" value={selected.productCode} />
              <DetailItem label="LPOAD" value={selected.lpoad} />
              <DetailItem label="Payment Plan" value={selected.paymentPlanType} />
              <DetailItem label="Product Status" value={selected.productStatus} />
              <DetailItem label="Total Fee" value={fmt(selected.totalProgrammeFee)} />
              <DetailItem label="Discount" value={fmt(selected.discountApplied)} />
              <DetailItem label="Net Payable" value={fmt(selected.totalFeePayable)} />
              <DetailItem label="Jodo Flex" value={fmt(selected.amountPaidInFlex)} />
              <DetailItem label="Direct Pay" value={fmt(selected.amountPaidToNxtWave)} />
              <DetailItem label="NBFC Covered" value={fmt(selected.nbfcLoanAmountCovered)} />
              <DetailItem label="Total Covered" value={fmt(selected.totalAmountCovered)} />
              <DetailItem label="Remaining" value={fmt(selected.remainingAmountToPay)} highlight />
              <DetailItem label="Flex Status" value={selected.flexCurrentStatus} />
              <DetailItem label="Current NBFC" value={selected.currentNBFC} />
              <DetailItem label="NBFC Status" value={selected.currentNBFCStatus} />
            </div>
            {(selected.nbfc1?.name || selected.nbfc2?.name) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.nbfc1?.name && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">NBFC 1</p>
                    <p className="text-xs font-black text-slate-900">{selected.nbfc1.name}</p>
                    <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                      <span>Loan: {fmt(selected.nbfc1.loanAmount)}</span>
                      <span>EMI: {fmt(selected.nbfc1.emiAmount)}</span>
                      <span>{selected.nbfc1.loanTenure}</span>
                    </div>
                  </div>
                )}
                {selected.nbfc2?.name && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">NBFC 2</p>
                    <p className="text-xs font-black text-slate-900">{selected.nbfc2.name}</p>
                    <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                      <span>Loan: {fmt(selected.nbfc2.loanAmount)}</span>
                      <span>EMI: {fmt(selected.nbfc2.emiAmount)}</span>
                      <span>{selected.nbfc2.loanTenure}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <p className="text-xs text-slate-400 text-center py-4">No students found.</p>
      )}
    </div>
  );
}

/* ─── Feedback Tab ─── */
function FeedbackTab() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, []);

  function loadFeedback() {
    setLoading(true);
    adminAPI.getFeedback().then((res) => {
      setFeedback(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-sm text-slate-800">Student Feedback & Queries</h3>
        <button
          onClick={loadFeedback}
          className="text-[10px] font-black text-blue-900 uppercase tracking-widest hover:underline cursor-pointer"
        >
          Refresh
        </button>
      </div>
      {feedback.length === 0 ? (
        <Empty text="No feedback received yet." />
      ) : (
        <div className="space-y-2">
          {feedback.map((fb) => (
            <div key={fb.id} className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-900">{fb.userId}</span>
                  <span className="text-[10px] text-slate-400">{fb.name}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(fb.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{fb.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Export Tab ─── */
function ExportTab() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await adminAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_data.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
      <Download size={32} className="text-slate-300 mx-auto mb-3" />
      <h3 className="font-black text-sm text-slate-800 mb-1">Export Student Data</h3>
      <p className="text-xs text-slate-400 mb-4">
        Download all student payment data from Google Sheets as a CSV file.
      </p>
      <button
        onClick={handleExport}
        disabled={loading}
        className="px-6 py-2.5 bg-blue-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {loading ? "Exporting..." : "Download CSV"}
      </button>
    </div>
  );
}

/* ─── Shared Components ─── */
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-900",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon size={14} />
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function DetailItem({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${highlight ? "text-rose-600" : "text-slate-800"}`}>
        {value || "--"}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 text-blue-900 animate-spin" />
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}
