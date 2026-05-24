"use client";

import { useT } from "@/i18n/useT";

interface BirthTimeInputProps {
  readonly hour: string;
  readonly minute: string;
  readonly unknown: boolean;
  readonly sijin?: { label: string; hanja: string } | null;
  readonly onHourChange: (v: string) => void;
  readonly onMinuteChange: (v: string) => void;
  readonly onUnknownChange: (v: boolean) => void;
  readonly disabled?: boolean;
  readonly inputClasses: string;
}

export function BirthTimeInput({
  hour,
  minute,
  unknown,
  sijin,
  onHourChange,
  onMinuteChange,
  onUnknownChange,
  disabled = false,
  inputClasses,
}: BirthTimeInputProps) {
  const { t } = useT();
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { onHourChange(""); return; }
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 0 && n <= 23) onHourChange(String(n));
          }}
          disabled={disabled || unknown}
          placeholder={t("birth-time.hour-placeholder")}
          className={`${inputClasses} w-20 text-center disabled:opacity-40`}
        />
        <span className="text-arcana-muted text-lg">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { onMinuteChange(""); return; }
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 0 && n <= 59) onMinuteChange(String(n));
          }}
          disabled={disabled || unknown}
          placeholder={t("birth-time.minute-placeholder")}
          className={`${inputClasses} w-20 text-center disabled:opacity-40`}
        />
        {sijin && !unknown && (
          <span className="text-arcana-purple/80 text-xs font-serif ml-1">
            → {sijin.label}({sijin.hanja})
          </span>
        )}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={unknown}
          onChange={(e) => {
            onUnknownChange(e.target.checked);
            if (e.target.checked) {
              onHourChange("");
              onMinuteChange("");
            }
          }}
          className="w-4 h-4 rounded border-arcana-border accent-arcana-purple"
        />
        <span className="text-arcana-muted text-xs">{t("birth-time.unknown")}</span>
      </label>
    </>
  );
}
