import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Badge } from '../ui/Badge';

const ItemTable = ({ items = [], onRemoveItem, onEditItem }) => {
  return (
    <div className="w-full">
      <Table>
        <Thead>
          <tr>
            <Th className="w-[40px]">#</Th>
            <Th>Product</Th>
            <Th className="text-center">Qty</Th>
            <Th className="text-center">Unit</Th>
            <Th className="text-center">Price</Th>
            <Th className="text-center">GST</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Action</Th>
          </tr>
        </Thead>
        <Tbody>
          {items.map((item, index) => {
            const uniqueKey = item.tableId || item.id || index;
            const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
            const totalWithGST = (item.amount || 0) + gstAmount;

            return (
              <Tr key={uniqueKey}>
                <Td className="text-[#64748B] font-mono">{index + 1}</Td>
                <Td>
                   <div className="font-semibold text-[#0F172A]">{item.name}</div>
                   {item.sku && <div className="text-[11px] text-[#64748B] uppercase tracking-wider">{item.sku}</div>}
                   {item.meta && <div className="text-[10px] text-[#3B82F6]">{item.meta}</div>}
                </Td>
                <Td className="text-center font-bold">{item.quantity}</Td>
                <Td className="text-center text-[12px] text-[#64748B] uppercase">{item.unit || '-'}</Td>
                <Td className="text-center text-[#334155]">₹{Number(item.price).toFixed(2)}</Td>
                <Td className="text-center">
                   <Badge variant="gray">{item.gst_percent || 0}%</Badge>
                </Td>
                <Td className="text-right font-bold text-[#0F172A]">₹{totalWithGST.toFixed(2)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-[8px]">
                    <button onClick={() => onEditItem(item)} className="p-[6px] text-[#64748B] hover:text-[#3B82F6] hover:bg-[#F8FAFC] rounded-md transition-colors" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onRemoveItem(uniqueKey)} className="p-[6px] text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded-md transition-colors" title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {items.length === 0 && (
            <Tr>
              <Td colSpan="8" className="text-center py-[24px] text-[#64748B]">No items added</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
};

export default ItemTable;
