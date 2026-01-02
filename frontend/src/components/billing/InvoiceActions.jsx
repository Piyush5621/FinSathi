import React from 'react';
import { Save, Printer, Loader2 } from 'lucide-react';

const InvoiceActions = ({ onSave, onPrint, isSaving }) => {
  return (
    <div>
      <h3 className="text-indigo-400 text-lg font-semibold mb-4">Actions</h3>

      <div className="flex flex-col gap-3">
        {/* Save Invoice Button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl font-semibold text-white transition-all duration-200 
            ${isSaving 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Invoice
            </>
          )}
        </button>

        {/* Print Invoice Button */}
        <button
          onClick={onPrint}
          className="flex items-center justify-center gap-2 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
        >
          <Printer className="h-5 w-5" />
          Print Invoice
        </button>
      </div>
    </div>
  );
};

export default InvoiceActions;
