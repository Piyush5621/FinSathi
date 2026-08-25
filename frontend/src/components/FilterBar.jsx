import React, { useState } from 'react';
import { Filter, Calendar, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';

const FilterBar = ({ onFilter, className = '' }) => {
  const [filterType, setFilterType] = useState('month');
  const [month, setMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (onFilter) {
      onFilter({
        type: filterType,
        ...(filterType === 'month' ? { month } : { startDate, endDate })
      });
    }
  };

  const handleReset = () => {
    setFilterType('month');
    setMonth('');
    setStartDate('');
    setEndDate('');
    if (onFilter) {
      onFilter({ type: 'all' });
    }
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
    <div className={`p-3.5 rounded-card bg-app-surface border border-app-border shadow-xs ${className}`}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-small font-medium text-app-text-secondary">
            <Filter size={15} className="text-app-text-muted" />
            <span>Filter:</span>
          </div>

          <div className="w-36">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'month', label: 'By Month' },
                { value: 'range', label: 'Date Range' }
              ]}
            />
          </div>

          {filterType === 'month' ? (
            <div className="w-40">
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={months}
                placeholder="Select Month"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-36">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Start Date"
                />
              </div>
              <span className="text-caption text-app-text-muted">to</span>
              <div className="w-36">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End Date"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw size={13} />}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
          >
            Apply Filter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
