import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Search, Filter, MapPin, Star, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';

import SectionHeader from './components/SectionHeader';
import NetworkTabs from './components/NetworkTabs';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import { LAYOUT, TYPOGRAPHY, BUTTONS } from './utils/networkConstants';
import API from '../../../services/apiClient';

// Use categories from constants or mock since it's just tabs
const DIRECTORY_CATEGORIES = [
  { id: 'all', label: 'All Businesses' },
  { id: 'manufacturing', label: 'Manufacturers' },
  { id: 'wholesale', label: 'Wholesalers' },
  { id: 'retail', label: 'Retailers' },
  { id: 'services', label: 'Services' }
];

export default function BusinessDirectory() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/network/profiles/search'); // assuming mounted under /profiles
      if (res.data?.success) {
        setBusinesses(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return businesses.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || item.type.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className={LAYOUT.container}>
      <SectionHeader 
        title="Business Directory"
        subtitle="Discover verified suppliers, manufacturers, and buyers across India."
        icon={BookOpen}
        action={
          <button className={BUTTONS.primary}>
            View My Profile
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <label htmlFor="search-directory" className="sr-only">Search directory</label>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="search-directory"
            type="text"
            placeholder="Search by business name, category, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <button className="px-5 py-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <Filter size={16} aria-hidden="true" /> Advanced Filters
        </button>
      </div>

      <NetworkTabs 
        tabs={DIRECTORY_CATEGORIES.map(c => ({ id: c.id, label: c.label }))}
        activeTab={activeCategory}
        onChange={setActiveCategory}
        variant="outline"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {loading ? (
          // Loading Skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className={`${LAYOUT.card} h-[240px] animate-pulse bg-slate-50`} />
          ))
        ) : filteredData.length === 0 ? (
          <div className="col-span-full">
            <EmptyState 
              icon={Search}
              title="No businesses found"
              description="Try adjusting your search criteria or changing the category filter."
            />
          </div>
        ) : (
          filteredData.map(business => (
            <Card key={business.id} className={`${LAYOUT.card} flex flex-col h-full hover:border-indigo-100 group`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md">
                  {business.name[0]}
                </div>
                {business.verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <ShieldCheck size={12} aria-hidden="true" /> Verified
                  </span>
                )}
              </div>
              
              <h3 className={`${TYPOGRAPHY.cardTitle} mb-1 line-clamp-1 group-hover:text-indigo-700 transition-colors`}>{business.name}</h3>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
                <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {business.location}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" aria-hidden="true" /> {business.rating}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-5 flex-1">
                {business.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button className={`${BUTTONS.primary} flex-1 text-xs py-2 min-h-[36px]`}>
                  Connect
                </button>
                <button className={`${BUTTONS.secondary} flex-1 text-xs py-2 min-h-[36px]`}>
                  View Profile
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
