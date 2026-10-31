import React, { useState } from 'react';
import { RefreshCw, Search, X, Check, ArrowRight } from 'lucide-react';

export default function SwapProductModal({
  isOpen,
  onClose,
  currentLine,
  catalogProducts = [],
  onSwap,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!isOpen || !currentLine) return null;

  const categories = [
    'ALL',
    'PANEL',
    'INVERTER',
    'BATTERY',
    'STRUCTURE',
    'CABLE',
    'BOS',
    'EARTHING',
    'SAFETY',
    'SERVICE',
  ];

  const filteredProducts = catalogProducts.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-[#714B67]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#241621]">Swap Product</h3>
              <p className="text-[11px] text-slate-500">
                Replace current item with an alternative from the catalogue.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Line Banner */}
        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-purple-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
              Current Component in Quote:
            </span>
            <span className="font-extrabold text-xs text-[#241621]">
              {currentLine.description}
            </span>
          </div>
          <span className="font-black text-xs text-[#714B67]">
            Qty: {currentLine.quantity}
          </span>
        </div>

        {/* Category Pills & Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs font-semibold outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#714B67] text-white shadow-xs'
                    : 'bg-[#FAF6F9] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[#EBDCE7]/50 border border-[#EBDCE7] rounded-xl p-2 bg-[#FAF6F9]">
          {filteredProducts.map((p) => {
            const isCurrent = currentLine.productId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isCurrent) {
                    onSwap(p);
                    onClose();
                  }
                }}
                className={`p-2.5 rounded-lg transition flex items-center justify-between cursor-pointer ${
                  isCurrent
                    ? 'bg-purple-100/70 border border-purple-300 opacity-70 cursor-not-allowed'
                    : 'hover:bg-white text-[#241621]'
                }`}
              >
                <div className="pr-2">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] bg-[#714B67] text-white px-1.5 py-0.2 rounded font-black">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    SKU: {p.sku} • {p.category} • {p.warrantyYears ? `${p.warrantyYears}yr Warranty` : 'Standard'}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="font-black text-xs text-[#714B67]">
                      ₹{Number(p.salePrice || 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-400">unit rate</div>
                  </div>
                  {!isCurrent && (
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-[#f09e38] hover:bg-[#e08920] text-[#241621] rounded-lg font-black text-[10px] transition cursor-pointer shadow-xs"
                    >
                      Swap
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EBDCE7] text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

