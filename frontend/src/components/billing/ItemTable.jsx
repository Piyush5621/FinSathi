import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ItemTable = ({ items = [], onRemoveItem, onEditItem }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="overflow-x-auto rounded-none border-t border-b border-gray-100 dark:border-gray-700 h-full">
        <table className="w-full text-left border-collapse relative">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider">#</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider">Product</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center">Qty</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center">Unit</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center">Price</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center">GST</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center">Total</th>
              <th className="p-3 font-semibold text-xs uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            <AnimatePresence mode='popLayout'>
              {items.map((item, index) => {
                const uniqueKey = item.tableId || item.id || index;
                const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
                const totalWithGST = (item.amount || 0) + gstAmount;

                return (
                  <motion.tr
                    key={uniqueKey}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                  >
                    <td className="p-3 text-gray-500 text-sm font-mono w-12">
                      {index + 1}
                    </td>

                    <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm">{item.name}</span>
                        {item.sku && (
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                            {item.sku}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">
                      {item.quantity}
                    </td>

                    <td className="p-3 text-center text-gray-500 text-xs uppercase">
                      {item.unit || '-'}
                    </td>

                    <td className="p-3 text-center text-gray-700 dark:text-gray-300 font-mono text-sm">
                      ₹{item.price.toFixed(2)}
                    </td>

                    <td className="p-3 text-center text-xs">
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        {item.gst_percent || 0}%
                      </span>
                    </td>

                    <td className="p-3 text-center font-bold text-indigo-600 text-sm font-mono">
                      ₹{totalWithGST.toFixed(2)}
                    </td>

                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditItem(item)} // Pass item to edit handler
                        className="text-gray-400 hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-indigo-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(uniqueKey)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {items.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="text-center py-12 text-gray-400"
                >
                  No items added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemTable;
