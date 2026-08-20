import React, { useState, useEffect, useMemo } from 'react';
import { PanelContainer } from './PanelContainer';

export interface PanelProps {
  onClose?: () => void;
}

import { getIconSrc, REGISTERED_ICONS } from '../../assets/icon-loader';

export interface EventTypeConfig {
  label?: string;
  color?: string;
  bg_color?: string;
  icon?: string;
  details?: string;
}

export interface CalendarEventItem {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  title: string;
  details?: string;
  type: string;
  icon?: string;
  on_complete?: string;
  on_miss?: string;
}

export interface CalendarData {
  event_types?: Record<string, EventTypeConfig | string>;
  events?: Record<string, any>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format a Date object to "YYYY-MM-DD" local date string.
 */
function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Resolves color and icon for an event type from configured event_types.
 */
export function resolveEventTypeInfo(
  typeKey?: string,
  customTypes?: Record<string, EventTypeConfig | string>
): {
  label: string;
  color?: string;
  bg_color?: string;
  icon?: string;
  details?: string;
} {
  if (!typeKey) {
    return { label: '', color: undefined, bg_color: undefined, icon: undefined, details: undefined };
  }

  const norm = typeKey.toLowerCase().trim();
  const custom = customTypes?.[norm] || customTypes?.[typeKey];

  let label = norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : '';
  let color: string | undefined = undefined;
  let bg_color: string | undefined = undefined;
  let icon: string | undefined = undefined;
  let details: string | undefined = undefined;

  if (typeof custom === 'string') {
    details = custom;
  } else if (custom && typeof custom === 'object') {
    if (custom.label) label = custom.label;
    if (custom.color) color = custom.color;
    if (custom.bg_color) bg_color = custom.bg_color;
    if (custom.icon) icon = custom.icon;
    if (custom.details) details = custom.details;
  }

  return { label, color, bg_color, icon, details };
}

/**
 * Helper to resolve icon source URL, with safe fallback to star or status.
 */
function resolveIconSrc(iconKey?: string, fallback = 'star'): string {
  if (iconKey) {
    const src = getIconSrc(iconKey);
    if (src) return src;
  }
  return getIconSrc(fallback) || getIconSrc('status') || '';
}

export const CalendarPanel: React.FC<PanelProps> = ({ onClose }) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(
    () => formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);
  const [calendarData, setCalendarData] = useState<CalendarData>({});

  // Load calendar_events.json from Electron user-data or memory storage
  const loadCalendarEvents = async () => {
    try {
      let raw: string | null = null;
      if (typeof window !== 'undefined' && (window as any).electronAPI?.readMemoryFile) {
        raw = await (window as any).electronAPI.readMemoryFile('calendar_events.json');
      }

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setCalendarData(parsed || {});
        } catch (err) {
          console.warn('[CalendarPanel] Failed to parse calendar_events.json:', err);
        }
      }
    } catch (err) {
      console.warn('[CalendarPanel] Failed to load calendar data:', err);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  // Parse all events into an array of CalendarEventItem
  const eventsList: CalendarEventItem[] = useMemo(() => {
    const rawEvents = calendarData.events || {};
    const items: CalendarEventItem[] = [];

    Object.entries(rawEvents).forEach(([key, val]) => {
      if (!val) return;

      const eventEntries = Array.isArray(val) ? val : [val];

      eventEntries.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;

        let dateStr = entry.date || entry.dateStr || key;

        // If key is "MM-DD", attach current viewing year
        if (/^\d{2}-\d{2}$/.test(dateStr)) {
          dateStr = `${currentYear}-${dateStr}`;
        }

        items.push({
          id: entry.id || `${dateStr}_${entry.type || 'event'}_${idx}`,
          dateStr,
          title: entry.title || 'Untitled Event',
          details: entry.details || entry.description || '',
          type: entry.type || '',
          icon: entry.icon,
          on_complete: entry.on_complete,
          on_miss: entry.on_miss,
        });
      });
    });

    return items;
  }, [calendarData, currentYear]);

  // Map events by "YYYY-MM-DD" for fast lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    eventsList.forEach((ev) => {
      if (!map[ev.dateStr]) {
        map[ev.dateStr] = [];
      }
      map[ev.dateStr].push(ev);
    });
    return map;
  }, [eventsList]);

  // Calendar Grid Days Generation
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEventItem[];
    }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateKey = formatDateKey(prevYear, prevMonth, dayNum);
      const evs = eventsByDate[dateKey] || [];
      days.push({
        dateKey,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        events: evs,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateKey = formatDateKey(currentYear, currentMonth, d);
      const evs = eventsByDate[dateKey] || [];
      days.push({
        dateKey,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        events: evs,
      });
    }

    // Next month filler days
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remainingCells; nextD++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateKey = formatDateKey(nextYear, nextMonth, nextD);
      const evs = eventsByDate[dateKey] || [];
      days.push({
        dateKey,
        dayNumber: nextD,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        events: evs,
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate, todayKey]);

  // Selected date events for modal
  const modalEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayKey);
    setSelectedEventIndex(0);
  };

  const handleDayClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedEventIndex(0);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedEventIndex(0);
  };

  // Header display date
  const monthHeaderTitle = `${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}`;

  // Formatted date string for modal header
  const formattedModalDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return selectedDate;
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = MONTH_NAMES[m - 1];
    return `${dayName}, ${monthName} ${d}, ${y}`;
  }, [selectedDate]);

  const isModalDateToday = selectedDate === todayKey;
  const currentModalEvent = modalEvents[selectedEventIndex] || modalEvents[0];
  const currentEventTypeMeta = currentModalEvent
    ? resolveEventTypeInfo(currentModalEvent.type, calendarData.event_types)
    : null;

  const currentEventIconSrc = currentModalEvent
    ? resolveIconSrc(currentModalEvent.icon || currentEventTypeMeta?.icon, 'star')
    : resolveIconSrc('star');

  return (
    <PanelContainer
      title="Calendar"
      icon={REGISTERED_ICONS.calendar}
      className="calendar-panel-card"
      onClose={onClose}
    >
      {/* Top Controls Bar: Month / Year Navigation & Quick Jump */}
      <div className="cal-header-bar">
        <div className="cal-nav-group">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={handlePrevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            ◀
          </button>
          <span className="cal-month-title">{monthHeaderTitle}</span>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={handleNextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            ▶
          </button>
        </div>

        <button
          type="button"
          className={`cal-today-btn ${currentYear === today.getFullYear() && currentMonth === today.getMonth() ? 'is-current' : 'needs-jump'
            }`}
          onClick={handleJumpToToday}
          title="Jump to Today"
        >
          TODAY
        </button>
      </div>

      {/* Pixel Art Calendar Grid Frame */}
      <div className="cal-grid-frame">
        {/* Weekday Header */}
        <div className="cal-weekdays-row">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div key={idx} className={`cal-weekday-cell ${idx === 0 || idx === 6 ? 'weekend' : ''}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Month Days Grid */}
        <div className="cal-days-grid">
          {calendarGridDays.map((cell) => {
            const hasEvents = cell.events.length > 0;
            const isToday = cell.isToday;

            // Resolve event types & icons for markers
            const firstEvent = cell.events[0];
            const secondEvent = cell.events[1];

            const firstInfo = firstEvent
              ? resolveEventTypeInfo(firstEvent.type, calendarData.event_types)
              : null;
            const secondInfo = secondEvent
              ? resolveEventTypeInfo(secondEvent.type, calendarData.event_types)
              : null;

            const firstIconSrc = firstEvent
              ? resolveIconSrc(firstEvent.icon || firstInfo?.icon, 'star')
              : undefined;
            const secondIconSrc = secondEvent
              ? resolveIconSrc(secondEvent.icon || secondInfo?.icon, 'star')
              : undefined;

            return (
              <div
                key={cell.dateKey}
                className={`cal-day-cell ${cell.isCurrentMonth ? 'in-month' : 'out-month'} ${isToday ? 'is-today' : ''
                  } ${hasEvents ? 'has-events' : ''}`}
                onClick={() => handleDayClick(cell.dateKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDayClick(cell.dateKey);
                  }
                }}
                title={
                  hasEvents
                    ? `${cell.dateKey}: ${cell.events.map((e) => e.title).join(', ')} (Click for details)`
                    : `${cell.dateKey} (Click for details)`
                }
              >
                {/* Day number */}
                <span className="cal-day-number">{cell.dayNumber}</span>

                {/* Today indicator badge */}
                {isToday && <span className="cal-today-badge">TODAY</span>}

                {/* Event Marker Icons (Single or Layered Stack) */}
                {hasEvents && firstIconSrc && (
                  <div className="cal-day-icons-layer">
                    {cell.events.length === 1 ? (
                      /* Single Event: Centered Icon */
                      <div className="cal-single-icon-wrap" title={firstEvent.title}>
                        <img src={firstIconSrc} alt={firstEvent.title} className="cal-day-icon-img" />
                      </div>
                    ) : (
                      /* Two or More Events: Layered / Cascaded Icons */
                      <div className="cal-layered-icons-wrap" title={cell.events.map((e) => e.title).join(' | ')}>
                        {/* Under Layer (Base Event) */}
                        <div className="cal-layer-icon under-layer">
                          <img src={firstIconSrc} alt={firstEvent.title} className="cal-day-icon-img" />
                        </div>

                        {/* Top Layer (Second Event, shifted slightly) */}
                        {secondIconSrc && (
                          <div className="cal-layer-icon top-layer">
                            <img src={secondIconSrc} alt={secondEvent?.title} className="cal-day-icon-img" />
                          </div>
                        )}

                        {/* Extra event count indicator if 3+ */}
                        {cell.events.length > 2 && (
                          <span className="cal-layer-plus-badge">+{cell.events.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal Overlay */}
      {selectedDate && (
        <div className="cal-modal-overlay" onClick={handleCloseModal}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="cal-modal-header">
              <div className="cal-modal-date-wrap">
                <span className="cal-modal-date">{formattedModalDate}</span>
                {isModalDateToday && <span className="cal-today-tag">TODAY</span>}
              </div>
              <button
                type="button"
                className="cal-modal-close-btn"
                onClick={handleCloseModal}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="cal-modal-body">
              {modalEvents.length > 0 ? (
                <>
                  {/* Multi-event tab switchers */}
                  {modalEvents.length > 1 && (
                    <div className="cal-modal-tabs">
                      {modalEvents.map((ev, idx) => {
                        const info = resolveEventTypeInfo(ev.type, calendarData.event_types);
                        const tabIconSrc = resolveIconSrc(ev.icon || info.icon, 'star');
                        const isTabActive = selectedEventIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`cal-modal-tab-btn ${isTabActive ? 'active' : ''}`}
                            style={
                              isTabActive
                                ? { backgroundColor: info.bg_color, borderColor: info.color, color: info.color }
                                : undefined
                            }
                            onClick={() => setSelectedEventIndex(idx)}
                          >
                            <img src={tabIconSrc} alt={info.label} className="cal-modal-tab-icon-img" />
                            <span className="cal-modal-tab-title">{ev.title.slice(0, 12)}...</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Event Card */}
                  {currentModalEvent && (
                    <div
                      className="cal-modal-event-card"
                      style={currentEventTypeMeta?.color ? { borderLeftColor: currentEventTypeMeta.color } : undefined}
                    >
                      {currentEventTypeMeta?.label && (
                        <div
                          className="cal-modal-type-badge"
                          style={{
                            backgroundColor: currentEventTypeMeta.bg_color || 'transparent',
                            color: currentEventTypeMeta.color || 'inherit',
                            borderColor: currentEventTypeMeta.color || 'transparent',
                          }}
                        >
                          {currentEventIconSrc && (
                            <img src={currentEventIconSrc} alt={currentEventTypeMeta.label} className="cal-badge-icon-img" />
                          )}
                          <span className="cal-badge-name">{currentEventTypeMeta.label}</span>
                        </div>
                      )}

                      <h4 className="cal-modal-event-title">{currentModalEvent.title}</h4>

                      {currentModalEvent.details && (
                        <p className="cal-modal-event-details">{currentModalEvent.details}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="cal-modal-empty">
                  <img src={resolveIconSrc('status')} alt="Status" className="cal-modal-empty-icon" />
                  <h4 className="cal-empty-title">No events on this day</h4>
                  <p className="cal-empty-desc">A peaceful day to spend with Chleo!</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="cal-modal-actions">
              <button
                type="button"
                className="cal-modal-btn close-btn"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  );
};
