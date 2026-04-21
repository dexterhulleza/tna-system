/**
 * PsocWorkFunctionPicker
 * Searchable grouped dropdown for PSOC-aligned Primary Work Function selection.
 * Shows grouped options with group labels, search capability, and "Others (specify)" free-text.
 */
import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Briefcase } from "lucide-react";
import { PSOC_GROUPS, ALL_PSOC_FUNCTIONS, type PsocJobFunction } from "@/lib/psocData";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WorkFunctionValue {
  category: string;       // e.g. "PROFESSIONALS"
  title: string;          // normalized e.g. "SOFTWARE_DEVELOPER"
  psocCode: string;       // e.g. "2.01"
  otherText?: string;     // only when title === "OTHERS_SPECIFY"
  displayLabel: string;   // human-readable label for display
}

interface Props {
  value?: WorkFunctionValue | null;
  onChange: (val: WorkFunctionValue | null) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export default function PsocWorkFunctionPicker({ value, onChange, required, disabled, error }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [otherText, setOtherText] = useState(value?.otherText ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync otherText when value changes externally
  useEffect(() => {
    setOtherText(value?.otherText ?? "");
  }, [value?.otherText]);

  const isOthers = value?.title === "OTHERS_SPECIFY";

  // Filter functions by search query
  const query = search.toLowerCase().trim();
  const filteredGroups = query
    ? PSOC_GROUPS.map((g) => ({
        ...g,
        functions: g.functions.filter(
          (f) =>
            f.title.toLowerCase().includes(query) ||
            f.code.includes(query) ||
            g.label.toLowerCase().includes(query)
        ),
      })).filter((g) => g.functions.length > 0)
    : PSOC_GROUPS;

  function selectFunction(fn: PsocJobFunction & { groupLabel?: string; groupCategory?: string }, groupCategory: string, groupLabel: string) {
    const isOthersFn = fn.normalizedTitle === "OTHERS_SPECIFY";
    onChange({
      category: groupCategory,
      title: fn.normalizedTitle,
      psocCode: fn.code,
      otherText: isOthersFn ? otherText : undefined,
      displayLabel: isOthersFn ? "Others (specify)" : fn.title,
    });
    setSearch("");
    if (!isOthersFn) setOpen(false);
  }

  function handleOtherTextChange(text: string) {
    setOtherText(text);
    if (value && isOthers) {
      onChange({ ...value, otherText: text });
    }
  }

  function clearSelection() {
    onChange(null);
    setOtherText("");
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors",
          "bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30",
          error ? "border-red-400" : "border-slate-200",
          disabled && "opacity-60 cursor-not-allowed",
          open && "ring-2 ring-primary/30 border-primary/50"
        )}
      >
        <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className={cn("flex-1 truncate", !value && "text-slate-400")}>
          {value
            ? isOthers
              ? otherText
                ? `Others: ${otherText}`
                : "Others (specify) — please describe below"
              : value.displayLabel
            : "Search or select your primary work function"}
        </span>
        {value && !disabled ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearSelection(); }}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className={cn("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search job functions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No matching functions found</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.code}>
                  {/* Group header */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                    {group.label}
                  </div>
                  {/* Group items */}
                  {group.functions.map((fn) => {
                    const isSelected = value?.title === fn.normalizedTitle;
                    return (
                      <button
                        key={fn.code}
                        type="button"
                        onClick={() => selectFunction(fn, group.category, group.label)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors flex items-center gap-2",
                          isSelected && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <span className="text-xs text-slate-400 w-8 flex-shrink-0">{fn.code}</span>
                        <span className="flex-1">{fn.title}</span>
                        {isSelected && <span className="text-primary text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Others free-text field */}
      {isOthers && (
        <div className="mt-2">
          <Input
            placeholder="Describe your work function (max 150 characters)"
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value.slice(0, 150))}
            className={cn("text-sm", !otherText && error ? "border-red-400" : "")}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-slate-500">Required when "Others" is selected.</p>
            <span className={cn("text-xs", otherText.length >= 140 ? "text-amber-500" : "text-slate-400")}>
              {otherText.length}/150
            </span>
          </div>
        </div>
      )}

      {/* Helper text */}
      {!error && (
        <p className="text-xs text-slate-500 mt-1">
          This helps identify relevant competency standards and training recommendations.
        </p>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
