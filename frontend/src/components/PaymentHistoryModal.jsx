import { X, Loader2 } from "lucide-react";

const fmt = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return value || "--";
  return `\u20B9${num.toLocaleString("en-IN")}`;
};

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

export default function PaymentHistoryModal({ isOpen, onClose, title, columns, data, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No records found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200">
                  {columns.map((col) => (
                    <th key={col.key} className="text-left py-2.5 px-3">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col.key} className="py-2.5 px-3 text-slate-700">
                        {col.isAmount ? (
                          <span className="font-bold">{fmt(row[col.key])}</span>
                        ) : col.isStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(row[col.key])}`}
                          >
                            {row[col.key] || "--"}
                          </span>
                        ) : (
                          row[col.key] || "--"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
