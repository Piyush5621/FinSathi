
import { Trash2, Edit2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Badge } from '../ui/Badge';

const ItemTable = ({ items = [], onRemoveItem, onEditItem }) => {
  return (
    <div className="w-full">
      <Table>
        <Thead>
          <Tr>
            <Th className="w-[40px]">#</Th>
            <Th>Product</Th>
            <Th className="text-center">Qty</Th>
            <Th className="text-center">Unit</Th>
            <Th className="text-center">Price</Th>
            <Th className="text-center">GST</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item, index) => {
            const uniqueKey = item.tableId || item.id || index;
            const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
            const totalWithGST = (item.amount || 0) + gstAmount;

            return (
              <Tr key={uniqueKey}>
                <Td className="text-slate-400 font-mono text-[10px]">{index + 1}</Td>
                <Td>
                   <div className="font-semibold text-slate-800">{item.name}</div>
                   {item.sku && <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{item.sku}</div>}
                   {item.meta && <div className="text-[9px] text-brand-blue font-bold mt-0.5">{item.meta}</div>}
                </Td>
                <Td className="text-center font-semibold text-slate-800">{item.quantity}</Td>
                <Td className="text-center text-[10px] text-slate-400 uppercase font-bold">{item.unit || '-'}</Td>
                <Td className="text-center text-slate-600 font-medium">₹{Number(item.price).toFixed(2)}</Td>
                <Td className="text-center">
                   <Badge variant="gray">{item.gst_percent || 0}%</Badge>
                </Td>
                <Td className="text-right font-bold text-slate-800">₹{totalWithGST.toFixed(2)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditItem(item)} className="p-1 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded-lg transition-all cursor-pointer" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => onRemoveItem(uniqueKey)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
          {items.length === 0 && (
            <Tr>
              <Td colSpan="8" className="text-center py-6 text-slate-400 text-xs font-medium">No items added to cart</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
};

export default ItemTable;
