import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudentPortalPreview from "../components/StudentPortalPreview";
import { adminAPI } from "../services/api";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AdminStudentPreview() {
  const { userId } = useParams();
  const [portal, setPortal] = useState(null);
  const [meta, setMeta] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setError("Missing user ID");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      setMissing(false);
      setPortal(null);
      try {
        const res = await adminAPI.getStudentDetails(userId);
        if (cancelled) return;
        setMeta({
          userId: res.data.userId,
          name: res.data.name,
          programme: res.data.programme,
        });
        if (res.data.portal) {
          setPortal(res.data.portal);
        } else {
          setError("Portal preview data unavailable for this student.");
        }
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setMissing(true);
          setMeta({ userId, name: "", programme: "" });
        } else {
          setError(
            err.response?.data?.error || "Unable to load student preview"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            Loading student portal preview…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Admin · student portal preview
          </p>
          <p className="text-sm font-black text-slate-900 truncate">
            {meta?.name || "Student"}
            {meta?.programme ? (
              <span className="font-semibold text-slate-500">
                {" "}
                · {meta.programme}
              </span>
            ) : null}
          </p>
          <p className="text-[10px] font-bold text-blue-900 truncate">
            {meta?.userId || userId}
          </p>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 no-underline shrink-0"
        >
          <ArrowLeft size={14} />
          Back to admin
        </Link>
      </div>

      {missing && (
        <div className="max-w-xl mx-auto mt-10 px-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 text-sm font-semibold text-amber-950 leading-relaxed">
            This student is not in the BigQuery fee details dataset yet — so the
            payment portal preview is unavailable.
          </div>
        </div>
      )}

      {error && !missing && (
        <div className="max-w-xl mx-auto mt-10 px-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-4 text-sm font-semibold text-rose-900">
            {error}
          </div>
        </div>
      )}

      {portal && (
        <div className="flex-1 min-h-[calc(100vh-56px)]">
          <StudentPortalPreview portal={portal} />
        </div>
      )}
    </div>
  );
}
