import * as React from "react"
import ReactDOM from "react-dom"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  isBefore,
  getDay,
} from "date-fns"
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

interface DatePickerWithRangeProps {
  className?: string
  onDateRangeChange?: (range: DateRange | undefined) => void
  initialDateRange?: DateRange
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function DatePickerWithRange({
  className,
  onDateRangeChange,
  initialDateRange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDateRange || {
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }
  )
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(
    date?.from || new Date()
  )
  const [selectingEnd, setSelectingEnd] = React.useState(false)
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0 })

  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    onDateRangeChange?.(date)
  }, [date, onDateRangeChange])

  // Sync external initialDateRange
  React.useEffect(() => {
    if (initialDateRange?.from) {
      setCurrentMonth(initialDateRange.from)
    }
  }, [initialDateRange?.from])

  // Calculate position when opening
  React.useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropdownHeight = 430
      const dropdownWidth = 320
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < dropdownHeight && rect.top > dropdownHeight
        ? rect.top - dropdownHeight - 4
        : rect.bottom + 4
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 8))
      setDropdownPos({ top, left })
    }
  }, [isOpen])

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = triggerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Close on scroll/resize
  React.useEffect(() => {
    if (!isOpen) return
    const close = () => setIsOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [isOpen])

  const handleDayClick = (day: Date) => {
    if (!selectingEnd) {
      setDate({ from: day, to: undefined })
      setSelectingEnd(true)
    } else {
      if (date?.from && isBefore(day, date.from)) {
        setDate({ from: day, to: undefined })
      } else {
        setDate({ from: date?.from, to: day })
        setSelectingEnd(false)
        setIsOpen(false)
      }
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate({ from: undefined, to: undefined })
    setSelectingEnd(false)
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const firstDayOfWeek = getDay(monthStart)
  const prevMonthEnd = endOfMonth(subMonths(currentMonth, 1))
  const paddingDays: Date[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(prevMonthEnd)
    d.setDate(prevMonthEnd.getDate() - i)
    paddingDays.push(d)
  }

  const lastDayOfWeek = getDay(monthEnd)
  const nextMonthStart = startOfMonth(addMonths(currentMonth, 1))
  const trailingDays: Date[] = []
  for (let i = 0; i < 6 - lastDayOfWeek; i++) {
    const d = new Date(nextMonthStart)
    d.setDate(nextMonthStart.getDate() + i)
    trailingDays.push(d)
  }

  const allDays = [...paddingDays, ...calendarDays, ...trailingDays]

  const isInRange = (day: Date) => {
    if (!date?.from || !date?.to) return false
    return isWithinInterval(day, { start: date.from, end: date.to })
  }
  const isRangeStart = (day: Date) => !!(date?.from && isSameDay(day, date.from))
  const isRangeEnd = (day: Date) => !!(date?.to && isSameDay(day, date.to))
  const isToday = (day: Date) => isSameDay(day, new Date())
  const isCurrentMonth = (day: Date) => isSameMonth(day, currentMonth)

  // Portal dropdown — rendered into body, never clipped by parents
  const dropdown = isOpen ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      className={cn(
        "bg-white dark:bg-zinc-900",
        "rounded-2xl shadow-2xl shadow-black/25 dark:shadow-black/60",
        "border border-gray-200 dark:border-white/10",
        "overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-150",
        "w-[310px]"
      )}
    >
      {/* Start / End header */}
      <div className="flex items-center border-b border-gray-100 dark:border-white/10">
        <div
          className={cn(
            "flex-1 px-4 py-3 cursor-pointer transition-all duration-150",
            !selectingEnd ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5"
          )}
          onClick={() => setSelectingEnd(false)}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">Start</span>
          <span className={cn("text-sm font-bold", !selectingEnd ? "text-blue-600 dark:text-blue-400" : "text-foreground")}>
            {date?.from ? format(date.from, "MM/dd/yyyy") : "—"}
          </span>
        </div>
        <div
          className={cn(
            "flex-1 px-4 py-3 cursor-pointer transition-all duration-150",
            selectingEnd ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5"
          )}
          onClick={() => setSelectingEnd(true)}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block text-right">End</span>
          <span className={cn("text-sm font-bold block text-right", selectingEnd ? "text-blue-600 dark:text-blue-400" : "text-foreground")}>
            {date?.to ? format(date.to, "MM/dd/yyyy") : "—"}
          </span>
        </div>
        <button
          onClick={handleClear}
          className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          title="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-3 pb-3">
        {allDays.map((day, i) => {
          const inRange = isInRange(day)
          const rangeStart = isRangeStart(day)
          const rangeEnd = isRangeEnd(day)
          const today = isToday(day)
          const curMonth = isCurrentMonth(day)

          return (
            <div
              key={i}
              className={cn(
                "relative flex items-center justify-center",
                inRange && !rangeStart && !rangeEnd && "bg-blue-100/60 dark:bg-blue-500/15",
                rangeStart && "bg-gradient-to-r from-transparent to-blue-100/60 dark:from-transparent dark:to-blue-500/15",
                rangeEnd && "bg-gradient-to-l from-transparent to-blue-100/60 dark:from-transparent dark:to-blue-500/15",
                i % 7 === 0 && inRange && "rounded-l-lg",
                i % 7 === 6 && inRange && "rounded-r-lg"
              )}
            >
              <button
                onClick={() => handleDayClick(day)}
                className={cn(
                  "w-9 h-9 rounded-full text-sm font-medium transition-all duration-150 relative z-10",
                  curMonth ? "text-foreground" : "text-muted-foreground/40",
                  "hover:bg-blue-100 dark:hover:bg-blue-500/20",
                  today && !rangeStart && !rangeEnd && "ring-1 ring-blue-400 dark:ring-blue-500",
                  (rangeStart || rangeEnd) &&
                    "bg-blue-500 text-white font-bold hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 shadow-md shadow-blue-500/30"
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 min-w-[240px] sm:min-w-[280px] rounded-xl cursor-pointer select-none transition-all duration-200",
          "bg-white/10 dark:bg-white/5 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "hover:bg-white/15 dark:hover:bg-white/8 hover:border-orange-400/30",
          "shadow-sm",
          isOpen && "border-orange-400/40 ring-2 ring-orange-400/15 bg-white/15 dark:bg-white/8"
        )}
      >
        <CalendarIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">
          {date?.from ? (
            date.to ? (
              <>{format(date.from, "MM/dd/yyyy")} - {format(date.to, "MM/dd/yyyy")}</>
            ) : (
              <>{format(date.from, "MM/dd/yyyy")} - Select end</>
            )
          ) : (
            <span className="text-muted-foreground">Please Select...</span>
          )}
        </span>
      </div>

      {dropdown}
    </div>
  )
}
