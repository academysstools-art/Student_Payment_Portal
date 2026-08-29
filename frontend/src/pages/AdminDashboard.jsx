import { useState, useEffect } from "react";
import AdminNavbar from "../components/AdminNavbar";
import { adminAPI } from "../services/api";
import {
  BarChart3, Search, MessageSquare, Download,
  Loader2, Users, Activity, Clock, Eye,
} from "lucide-react";

const fmtMoney = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? v || "--" : `₹${n.toLocaleString("en-IN")}`;
};

function openStudentPreviewTab(userId) {
  if (!userId) return;
  const url = `/admin/preview/${encodeURIComponent(userId)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

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

  const ev = data.eventStats;

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

      {/* Event Stats */}
      {ev && (
        <>
          <div className="px-1 pt-2">
            <h3 className="font-black text-sm text-slate-800">Page Engagement</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={Activity} label="Page Views" value={ev.totalPageViews} color="blue" />
            <StatCard icon={Clock} label="Avg Time Spent" value={`${ev.avgTimeSpent}s`} color="emerald" />
            <StatCard icon={Activity} label="Avg Scroll Depth" value={`${ev.avgScrollDepth}%`} color="amber" />
          </div>

          <div className="px-1 pt-2">
            <h3 className="font-black text-sm text-slate-800">Section Views</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={Activity} label="Payment Summary" value={ev.sectionViews.paymentSummary} color="blue" />
            <StatCard icon={Activity} label="Covered Amount" value={ev.sectionViews.coveredAmount} color="emerald" />
            <StatCard icon={Activity} label="EMI Details" value={ev.sectionViews.emiDetails} color="amber" />
          </div>

          <div className="px-1 pt-2">
            <h3 className="font-black text-sm text-slate-800">User Actions</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Activity} label="Payment History" value={ev.actionCounts.paymentHistory} color="blue" />
            <StatCard icon={Activity} label="Contact JODO" value={ev.actionCounts.contactJodo} color="emerald" />
            <StatCard icon={Activity} label="Contact NBFC" value={ev.actionCounts.contactNbfc} color="amber" />
            <StatCard icon={Activity} label="Chat Support" value={ev.actionCounts.chatSupport} color="blue" />
          </div>

          <div className="px-1 pt-2">
            <h3 className="font-black text-sm text-slate-800">Feedback Funnel</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={MessageSquare} label="Opened" value={ev.feedbackFunnel.opened} color="blue" />
            <StatCard icon={MessageSquare} label="Abandoned" value={ev.feedbackFunnel.abandoned} color="amber" />
            <StatCard icon={MessageSquare} label="Submitted" value={`${ev.feedbackFunnel.submitted}${ev.feedbackFunnel.opened > 0 ? ` (${Math.round((ev.feedbackFunnel.submitted / ev.feedbackFunnel.opened) * 100)}%)` : ""}`} color="emerald" />
          </div>
        </>
      )}

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
                  <th className="px-4 py-2 text-right">Preview</th>
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
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openStudentPreviewTab(log.userId)}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-900 hover:text-blue-700 cursor-pointer"
                      >
                        <Eye size={13} />
                        Open
                      </button>
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

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await adminAPI.searchStudents(query.trim());
      setResults(res.data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }

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

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Programme</th>
                  <th className="px-4 py-2">Remaining</th>
                  <th className="px-4 py-2 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((s) => (
                  <tr key={s.userId}>
                    <td className="px-4 py-2.5 text-xs font-black text-blue-900">{s.userId}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-700">{s.name || "--"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{s.programme}</td>
                    <td className="px-4 py-2.5 text-xs font-black text-slate-900">{fmtMoney(s.remainingAmountToPay)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openStudentPreviewTab(s.userId)}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-900 hover:text-blue-700 cursor-pointer"
                      >
                        <Eye size={13} />
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <div
              key={fb.id}
              className={`bg-white p-3 rounded-xl border ${
                fb.rating >= 4 ? "border-emerald-200" : fb.rating > 0 ? "border-amber-200" : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-900">{fb.userId}</span>
                  <span className="text-[10px] text-slate-400">{fb.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fb.rating > 0 && (
                    <span className="text-xs tracking-wide">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={i < fb.rating ? "text-amber-400" : "text-slate-200"}>&#9733;</span>
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {new Date(fb.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              </div>
              {fb.selectedOptions && fb.selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {fb.selectedOptions.map((opt) => (
                    <span
                      key={opt}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        fb.rating >= 4
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              {fb.comments && (
                <p className="text-xs text-slate-700 leading-relaxed">{fb.comments}</p>
              )}
              {/* Fallback for old message-only feedback */}
              {!fb.rating && fb.message && (
                <p className="text-xs text-slate-700 leading-relaxed">{fb.message}</p>
              )}
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
