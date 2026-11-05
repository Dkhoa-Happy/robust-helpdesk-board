import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  id,
  className = "",
  min,
  max,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Parse initial selected date
  const parsedDate = React.useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  // Current viewing month and year in the calendar popover
  const [viewYear, setViewYear] = React.useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(parsedDate.getMonth());

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep view aligned when value changes externally
  React.useEffect(() => {
    setViewYear(parsedDate.getFullYear());
    setViewMonth(parsedDate.getMonth());
  }, [parsedDate]);

  // Click outside to close popover
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Shift Sunday (0) to 6, Monday (1) to 0
  const startOffset = (firstDayOfWeek + 6) % 7;

  // Format YYYY-MM-DD
  const formatIso = (year: number, month: number, day: number) => {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  };

  const handleSelectDay = (day: number) => {
    const isoString = formatIso(viewYear, viewMonth, day);
    onChange(isoString);
    setIsOpen(false);
  };

  const formattedDisplay = React.useMemo(() => {
    if (!value) return "Pick a date";
    try {
      const [y, m, d] = value.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return value;
    }
  }, [value]);

  return (
    <div className={`shadcn-date-picker ${className}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        className={`shadcn-date-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label ? `${label}: ${formattedDisplay}` : `Date: ${formattedDisplay}`}
      >
        <CalendarIcon className="shadcn-date-icon" size={16} aria-hidden="true" />
        <span className="shadcn-date-text">{formattedDisplay}</span>
      </button>

      {isOpen && (
        <div
          className="shadcn-calendar-popover"
          role="dialog"
          aria-modal="true"
          aria-label="Calendar date picker"
        >
          {/* Header Month/Year Nav */}
          <div className="shadcn-calendar-header">
            <button
              type="button"
              className="shadcn-calendar-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="shadcn-calendar-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              className="shadcn-calendar-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="shadcn-calendar-weekdays" aria-hidden="true">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="shadcn-calendar-weekday">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="shadcn-calendar-grid" role="grid">
            {/* Empty offset slots */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <span key={`empty-${i}`} className="shadcn-calendar-empty" aria-hidden="true" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateString = formatIso(viewYear, viewMonth, day);
              const isSelected = value === dateString;
              const isDisabled =
                (min && dateString < min) || (max && dateString > max);

              return (
                <button
                  key={day}
                  type="button"
                  className={`shadcn-calendar-day ${isSelected ? "is-selected" : ""} ${
                    isDisabled ? "is-disabled" : ""
                  }`}
                  disabled={Boolean(isDisabled)}
                  onClick={() => handleSelectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="shadcn-calendar-footer">
            <button
              type="button"
              className="shadcn-calendar-today-btn"
              onClick={() => {
                const today = new Date();
                const todayIso = formatIso(today.getFullYear(), today.getMonth(), today.getDate());
                onChange(todayIso);
                setIsOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
