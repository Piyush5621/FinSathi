import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (itemsPerPage || 10))) {
    return null;
  }

  const startItem = totalItems !== undefined && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems !== undefined && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1 text-small text-app-text-secondary ${className}`}>
      <div>
        {startItem !== null && endItem !== null && totalItems !== undefined ? (
          <span>
            Showing <span className="font-semibold text-app-text tabular-nums">{startItem}</span> to{' '}
            <span className="font-semibold text-app-text tabular-nums">{endItem}</span> of{' '}
            <span className="font-semibold text-app-text tabular-nums">{totalItems}</span> results
          </span>
        ) : (
          <span>
            Page <span className="font-semibold text-app-text tabular-nums">{currentPage}</span> of{' '}
            <span className="font-semibold text-app-text tabular-nums">{totalPages}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={<ChevronLeft size={14} />}
          aria-label="Previous Page"
        >
          Previous
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-app-text-muted select-none">
                  ...
                </span>
              );
            }
            const isCurrent = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-btn text-small font-medium transition-all duration-150 cursor-pointer tabular-nums ${
                  isCurrent
                    ? 'bg-app-primary text-white font-semibold'
                    : 'text-app-text-secondary hover:bg-app-surface-secondary hover:text-app-text'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          iconRight={<ChevronRight size={14} />}
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
