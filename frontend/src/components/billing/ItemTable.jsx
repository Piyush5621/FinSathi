import { Trash2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Badge } from '../ui/Badge';

const ItemTable = ({ items = [], onRemoveItem, onUpdateItem }) => {
  if (items.length === 0) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center bg-slate-50 border-y border-slate-100">
        <p className="text-slate-400 text-xs font-semibold">Cart is empty.</p>
        <p className="text-[10px] text-slate-400 mt-1">Scan a barcode or search to add items.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* DESKTOP TABLE */}
      <div className="hidden md:block w-full">
        <Table>
          <Thead>
            <Tr>
              <Th className="w-[40px]">#</Th>
              <Th>Product</Th>
              <Th className="text-center w-[100px]">Qty</Th>
              <Th className="text-center w-[120px]">Price (₹)</Th>
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
                     {item.code && <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{item.code}</div>}
                  </Td>
                  <Td className="text-center">
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(uniqueKey, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-16 text-center text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </Td>
                  <Td className="text-center">
                    <input 
                      type="number" 
                      min="0" 
                      value={item.price}
                      onChange={(e) => onUpdateItem(uniqueKey, 'price', parseFloat(e.target.value) || 0)}
                      className="w-20 text-center text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </Td>
                  <Td className="text-center">
                     <Badge variant="gray">{item.gst_percent || 0}%</Badge>
                  </Td>
                  <Td className="text-right font-bold text-slate-800">₹{totalWithGST.toFixed(2)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onRemoveItem(uniqueKey)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>

      {/* MOBILE CARD LAYOUT */}
      <div className="md:hidden flex flex-col divide-y divide-slate-100">
        {items.map((item, index) => {
          const uniqueKey = item.tableId || item.id || index;
          const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
          const totalWithGST = (item.amount || 0) + gstAmount;

          return (
            <div key={uniqueKey} className="p-4 bg-white flex flex-col gap-3 relative">
              <div className="flex justify-between items-start pr-8">
                <div>
                  <h4 className="font-semibold text-sm text-slate-800 leading-tight">{item.name}</h4>
                  {item.code && <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{item.code}</p>}
                </div>
                <button 
                  onClick={() => onRemoveItem(uniqueKey)} 
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qty</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(uniqueKey, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={item.price}
                    onChange={(e) => onUpdateItem(uniqueKey, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div className="flex-[1.2] text-right">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total</label>
                  <p className="text-base font-black text-slate-900 mt-2">₹{totalWithGST.toFixed(2)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemTable;
