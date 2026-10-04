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
  isAfter,
  startOfDay,
  getDay,
} from "date-fns"
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

interface DatePickerWithRangeProps {
  className?: string
  onDateRangeChange?: (range: DateRange | undefined) => void
  initialDateRange?: DateRange
  disableFutureDates?: boolean
  maxDate?: Date
  minDate?: Date
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function DatePickerWithRange({
  className,
  onDateRangeChange,
  initialDateRange,
  disableFutureDates = true,
  maxDate,
  minDate,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDateRange || {
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }
  )
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(
    initialDateRange?.from || new Date()
  )
  const [selectingEnd, setSelectingEnd] = React.useState(false)
  const [hoveredDay, setHoveredDay] = React.useState<Date | null>(null)
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0 })

  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const effectiveMaxDate = maxDate || (disableFutureDates ? new Date() : undefined)

  const isDayDisabled = (day: Date) => {
    const dayStart = startOfDay(day).getTime()
    if (effectiveMaxDate) {
      const maxStart = startOfDay(effectiveMaxDate).getTime()
      if (dayStart > maxStart) return true
    }
    if (minDate) {
      const minStart = startOfDay(minDate).getTime()
      if (dayStart < minStart) return true
    }
    return false
  }

  // Sync external initialDateRange
  React.useEffect(() => {
    if (initialDateRange) {
      setDate(initialDateRange)
      if (initialDateRange.from) {
        setCurrentMonth(initialDateRange.from)
      }
    }
  }, [initialDateRange?.from?.toISOString(), initialDateRange?.to?.toISOString()])

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

  // Close on outside click or Escape key
  React.useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inTrigger = triggerRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) {
        setIsOpen(false)
        setSelectingEnd(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
        setSelectingEnd(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // Handle day click
  const handleDayClick = (day: Date) => {
    if (isDayDisabled(day)) return

    if (!selectingEnd) {
      // Step 1: User selected start date -> keep open, switch to select End date
      setDate({ from: day, to: undefined })
      setSelectingEnd(true)
      // If month of selected date is different from view, update
      if (!isSameMonth(day, currentMonth)) {
        setCurrentMonth(day)
      }
    } else {
      // Step 2: User selecting end date
      if (date?.from && isBefore(day, startOfDay(date.from))) {
        // If clicked date is before start date, restart range with this as start date
        setDate({ from: day, to: undefined })
        setSelectingEnd(true)
      } else {
        // Valid end date selected -> commit range and close
        const newRange: DateRange = { from: date?.from || day, to: day }
        setDate(newRange)
        onDateRangeChange?.(newRange)
        setSelectingEnd(false)
        setIsOpen(false)
      }
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    const cleared = { from: undefined, to: undefined }
    setDate(cleared)
    onDateRangeChange?.(undefined)
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
    if (date?.from && date?.to) {
      return isWithinInterval(day, { start: date.from, end: date.to })
    }
    if (selectingEnd && date?.from && hoveredDay && !isBefore(hoveredDay, date.from)) {
      return isWithinInterval(day, { start: date.from, end: hoveredDay })
    }
    return false
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
      {/* Start / End header tabs */}
      <div className="flex items-center border-b border-gray-100 dark:border-white/10 bg-slate-50/60 dark:bg-zinc-800/40">
        <div
          className={cn(
            "flex-1 px-3.5 py-2.5 cursor-pointer transition-all duration-150 border-b-2",
            !selectingEnd
              ? "border-blue-500 bg-blue-50/80 dark:bg-blue-500/15"
              : "border-transparent hover:bg-gray-100/60 dark:hover:bg-white/5"
          )}
          onClick={() => setSelectingEnd(false)}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Start Date
          </span>
          <span className={cn("text-xs font-bold truncate block", !selectingEnd ? "text-blue-600 dark:text-blue-400" : "text-foreground")}>
            {date?.from ? format(date.from, "MM/dd/yyyy") : "Select start"}
          </span>
        </div>
        <div
          className={cn(
            "flex-1 px-3.5 py-2.5 cursor-pointer transition-all duration-150 border-b-2",
            selectingEnd
              ? "border-blue-500 bg-blue-50/80 dark:bg-blue-500/15"
              : "border-transparent hover:bg-gray-100/60 dark:hover:bg-white/5"
          )}
          onClick={() => {
            if (date?.from) {
              setSelectingEnd(true)
            }
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-end gap-1">
            End Date {selectingEnd && !date?.to && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </span>
          <span className={cn("text-xs font-bold block text-right truncate", selectingEnd ? "text-blue-600 dark:text-blue-400" : "text-foreground")}>
            {date?.to ? format(date.to, "MM/dd/yyyy") : selectingEnd ? "Select end" : "—"}
          </span>
        </div>
        <button
          onClick={handleClear}
          className="p-2 mx-1 rounded-full hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          title="Clear dates"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Helper guide text */}
      <div className="px-4 py-1.5 bg-blue-500/5 border-b border-gray-100 dark:border-white/5 text-[11px] text-muted-foreground font-medium flex items-center justify-between">
        <span>{!selectingEnd ? "👉 Step 1: Pick start date" : "👉 Step 2: Pick end date"}</span>
        {selectingEnd && date?.from && (
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
            From {format(date.from, "MMM d")}
          </span>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <h3 className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={effectiveMaxDate ? startOfMonth(currentMonth) >= startOfMonth(effectiveMaxDate) : false}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={cn(
              "p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground",
              effectiveMaxDate && startOfMonth(currentMonth) >= startOfMonth(effectiveMaxDate)
                ? "opacity-30 cursor-not-allowed pointer-events-none"
                : "hover:bg-gray-100 dark:hover:bg-white/10"
            )}
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
          const disabled = isDayDisabled(day)

          return (
            <div
              key={i}
              onMouseEnter={() => {
                if (selectingEnd && !disabled) {
                  setHoveredDay(day)
                }
              }}
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
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "w-9 h-9 rounded-full text-sm font-medium transition-all duration-150 relative z-10",
                  disabled && "opacity-25 cursor-not-allowed pointer-events-none hover:bg-transparent",
                  !disabled && curMonth && "text-foreground",
                  !disabled && !curMonth && "text-muted-foreground/40",
                  !disabled && "hover:bg-blue-100 dark:hover:bg-blue-500/20",
                  today && !rangeStart && !rangeEnd && "ring-1 ring-blue-400 dark:ring-blue-500 font-bold",
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
        onClick={() => {
          if (!isOpen) {
            setSelectingEnd(false)
          }
          setIsOpen(!isOpen)
        }}
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
              <>{format(date.from, "MM/dd/yyyy")} - Select end date</>
            )
          ) : (
            <span className="text-muted-foreground">Select custom range...</span>
          )}
        </span>
      </div>

      {dropdown}
    </div>
  )
}
