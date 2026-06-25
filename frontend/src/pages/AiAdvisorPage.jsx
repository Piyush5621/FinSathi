import AiAdvisorHero from '../components/Dashboard/AiAdvisorHero';
import { useEffect, useState } from 'react';
import API from '../services/apiClient';
import Skeleton from '../components/ui/Skeleton';
import { Card } from '../components/ui/Card';
import { Bot } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AiAdvisorPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load advisor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 pb-16 max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Bot size={18} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Business Advisor</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium mt-1 ml-11">
          FinVoice — your intelligent business co-pilot. Ask anything about your finances.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-5">
              <Skeleton height="180px" rounded="rounded-[24px]" />
              <Skeleton height="200px" rounded="rounded-[24px]" />
            </div>
            <div className="lg:col-span-7">
              <Skeleton height="400px" rounded="rounded-[24px]" />
            </div>
          </div>
        </div>
      ) : !dashboardData ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center rounded-[24px]">
          <Bot size={48} className="text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-700">Could not load advisor data</h2>
          <p className="text-sm text-slate-400 mt-1">Make sure the backend is running and you have sales data.</p>
        </Card>
      ) : (
        <AiAdvisorHero dashboardData={dashboardData} />
      )}
    </div>
  );
}
