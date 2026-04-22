import { useState } from "react";
import { Calculator, Delete } from "lucide-react";

export default function PaymentCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [operator, setOperator] = useState(null);
  const [fresh, setFresh] = useState(true);

  function inputDigit(d) {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay(display === "0" && d !== "." ? d : display + d);
    }
  }

  function handleOperator(op) {
    const current = parseFloat(display);
    if (prev !== null && !fresh) {
      const result = calculate(prev, current, operator);
      setDisplay(String(result));
      setPrev(result);
    } else {
      setPrev(current);
    }
    setOperator(op);
    setFresh(true);
  }

  function calculate(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  }

  function handleEquals() {
    if (prev === null || operator === null) return;
    const current = parseFloat(display);
    const result = calculate(prev, current, operator);
    setDisplay(String(parseFloat(result.toFixed(10))));
    setPrev(null);
    setOperator(null);
    setFresh(true);
  }

  function handleClear() {
    setDisplay("0");
    setPrev(null);
    setOperator(null);
    setFresh(true);
  }

  function handleBackspace() {
    if (fresh) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }

  const fmt = (v) => {
    const num = parseFloat(v);
    if (isNaN(num)) return v;
    const parts = v.split(".");
    const intFormatted = parseFloat(parts[0]).toLocaleString("en-IN");
    return parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted;
  };

  const buttons = [
    "7", "8", "9", "÷",
    "4", "5", "6", "×",
    "1", "2", "3", "-",
    "0", ".", "=", "+",
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
        <Calculator size={12} className="text-blue-900" />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          Calculator
        </span>
      </div>

      {/* Display */}
      <div className="px-3 py-2.5 bg-slate-900 text-right">
        {prev !== null && operator && (
          <p className="text-[9px] text-slate-500 font-bold mb-0.5">
            {parseFloat(prev).toLocaleString("en-IN")} {operator}
          </p>
        )}
        <p className="text-lg font-black text-white tracking-tight truncate">
          {fmt(display)}
        </p>
      </div>

      {/* Buttons */}
      <div className="p-2 grid grid-cols-4 gap-1.5">
        <button
          onClick={handleClear}
          className="col-span-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors cursor-pointer"
        >
          AC
        </button>
        <button
          onClick={handleBackspace}
          className="col-span-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <Delete size={12} /> DEL
        </button>

        {buttons.map((btn) => {
          const isOp = ["÷", "×", "-", "+"].includes(btn);
          const isEquals = btn === "=";
          const isActive = isOp && operator === btn && fresh;

          return (
            <button
              key={btn}
              onClick={() => {
                if (isEquals) handleEquals();
                else if (isOp) handleOperator(btn);
                else inputDigit(btn);
              }}
              className={`py-1.5 rounded-lg font-black text-xs transition-colors cursor-pointer ${
                isEquals
                  ? "bg-blue-900 text-white hover:bg-blue-800"
                  : isOp
                  ? `${isActive ? "bg-blue-100 text-blue-900 ring-2 ring-blue-900" : "bg-blue-50 text-blue-900"} hover:bg-blue-100`
                  : "bg-slate-50 text-slate-800 hover:bg-slate-100"
              }`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
