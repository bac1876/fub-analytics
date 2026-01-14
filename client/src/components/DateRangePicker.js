import React, { useState } from 'react';
import './DateRangePicker.css';

function DateRangePicker({ dateRange, onChange }) {
  const [customStart, setCustomStart] = useState(dateRange.start);
  const [customEnd, setCustomEnd] = useState(dateRange.end);

  // Preset date ranges
  const presets = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'MTD', type: 'mtd' },
    { label: 'YTD', type: 'ytd' },
    { label: 'Last Month', type: 'lastMonth' },
    { label: 'Last Year', type: 'lastYear' }
  ];

  const applyPreset = (preset) => {
    const end = new Date();
    let start = new Date();

    if (preset.days) {
      start.setDate(start.getDate() - preset.days);
    } else if (preset.type === 'mtd') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset.type === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (preset.type === 'lastMonth') {
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      end.setDate(0); // Last day of previous month
    } else if (preset.type === 'lastYear') {
      start = new Date(end.getFullYear() - 1, 0, 1);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
    }

    const newRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };

    setCustomStart(newRange.start);
    setCustomEnd(newRange.end);
    onChange(newRange);
  };

  const applyCustomRange = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ start: customStart, end: customEnd });
    }
  };

  return (
    <div className="date-range-picker">
      <div className="presets">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className="preset-btn"
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <div className="date-input">
          <label>From:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
        </div>
        <div className="date-input">
          <label>To:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
        <button className="apply-btn" onClick={applyCustomRange}>
          Apply
        </button>
      </div>
    </div>
  );
}

export default DateRangePicker;
