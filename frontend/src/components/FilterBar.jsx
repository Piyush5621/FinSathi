import React, { useState } from 'react';

const FilterBar = ({ onFilter }) => {
  const [filterType, setFilterType] = useState('month');
  const [month, setMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilterChange = () => {
    onFilter({
      type: filterType,
      ...(filterType === 'month' ? { month } : { startDate, endDate })
    });
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-3">
          <label className="text-gray-200">Filter by:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Month</option>
            <option value="range">Date Range</option>
          </select>
        </div>

        {filterType === 'month' ? (
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Month</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-200">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}

        <button
          onClick={handleFilterChange}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
