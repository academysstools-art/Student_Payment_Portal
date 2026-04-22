import { PieChart, Calendar, Briefcase } from "lucide-react";

export default function NBFCDetails({ data }) {
  if (!data) return null;

  const hasNBFC1 = data.nbfc1?.name && data.nbfc1.name.trim() !== "";
  const hasNBFC2 = data.nbfc2?.name && data.nbfc2.name.trim() !== "";

  if (!hasNBFC1 && !hasNBFC2 && !data.currentNBFC) return null;

  const partnerCount = [hasNBFC1, hasNBFC2, !!data.currentNBFC].filter(Boolean).length;

  const fmt = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value || "--";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  function NBFCCard({ nbfc, label }) {
    if (!nbfc?.name || nbfc.name.trim() === "") return null;
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <PieChart size={14} className="text-blue-900" />
            <h4 className="font-black text-slate-800 tracking-tight uppercase text-[10px]">
              {label}
            </h4>
          </div>
          <span className="text-[9px] font-black text-slate-400 hidden sm:inline">REF: {nbfc.name}</span>
        </div>
        <div className="p-3 space-y-3 flex-1">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Financing Partner
              </p>
              <p className="text-sm font-black text-slate-900 truncate">{nbfc.name}</p>
            </div>
            <div className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0">
              {nbfc.status || "--"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Principal
              </p>
              <p className="font-black text-slate-800 text-sm">{fmt(nbfc.loanAmount)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                Tenure
              </p>
              <p className="font-black text-slate-800 text-xs">{nbfc.loanTenure || "--"}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">
              Monthly EMI
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-white">{fmt(nbfc.emiAmount)}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                / mo
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
          <Calendar size={11} className="text-slate-400" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Status: {nbfc.status || "--"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Financing Portfolio Header */}
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-900 text-white rounded-lg">
            <Briefcase size={14} />
          </div>
          <h3 className="font-black text-sm text-slate-800 tracking-tight">
            Financing Portfolio
          </h3>
        </div>
        <span className="text-[9px] font-black bg-blue-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
          {partnerCount} {partnerCount === 1 ? "Partner" : "Partners"}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {data.currentNBFC && (
          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Current NBFC:</span>
            <span className="font-black text-slate-900">{data.currentNBFC}</span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="font-bold text-slate-500">Status:</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-widest">
              {data.currentNBFCStatus || "--"}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NBFCCard nbfc={data.nbfc1} label="NBFC 1" />
          <NBFCCard nbfc={data.nbfc2} label="NBFC 2" />
        </div>
      </div>
    </div>
  );
}
