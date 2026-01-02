import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

const ExportButton = ({ onExport, label = 'Export', format = 'CSV' }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-finsathi-primary rounded-lg hover:bg-finsathi-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-finsathi-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isExporting ? (
        <>
          <Loader2 size={16} className="animate-spin mr-2" />
          Exporting...
        </>
      ) : (
        <>
          <Download size={16} className="mr-2" />
          {label} ({format})
        </>
      )}
    </button>
  );
};

export default ExportButton;
