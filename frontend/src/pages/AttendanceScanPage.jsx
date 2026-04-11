import {  useState, useEffect  } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Clock, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AttendanceScanPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const bizId = searchParams.get('biz');
    
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [businessName, setBusinessName] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!bizId) {
            toast.error("Invalid QR Code");
            navigate('/');
            return;
        }
        fetchData();
    }, [bizId]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Business Info
        const { data: bData } = await supabase.from('users').select('business_name').eq('id', bizId).single();
        if (bData) setBusinessName(bData.business_name);

        // Fetch Staff
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('user_id', bizId)
            .eq('status', 'active');
        
        if (error) toast.error("Error loading staff list");
        else setStaffList(data || []);
        setLoading(false);
    };

    const handleClockIn = async () => {
        if (!selectedStaff) return toast.error("Please select your name");

        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
            .from('attendance')
            .upsert({
                staff_id: selectedStaff.id,
                user_id: bizId,
                date: today,
                status: 'present',
                clock_in: new Date().toISOString()
            }, { onConflict: 'staff_id, date' });

        if (error) {
            console.error(error);
            toast.error("Attendance already marked or server error");
        } else {
            setIsSuccess(true);
            toast.success("Attendance marked successfully!");
            setTimeout(() => navigate('/'), 3000);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-bold text-brand-blue animate-pulse text-[20px]">FINSATHI SCANNER...</div>;

    if (isSuccess) {
        return (
            <div className="h-screen bg-emerald-500 flex flex-col items-center justify-center p-[24px] text-white animate-fade-in">
                <CheckCircle size={100} className="mb-[24px] animate-bounce" />
                <h1 className="text-[32px] font-black mb-[8px]">Clock In Success!</h1>
                <p className="text-[20px] font-medium opacity-90">{selectedStaff.name}</p>
                <p className="text-[14px] mt-[40px] opacity-70 italic font-medium">Redirecting to home...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center px-[20px] py-[60px]">
            <div className="text-center mb-[40px]">
                <h1 className="text-[24px] font-black text-brand-navy mb-[4px]">{businessName}</h1>
                <div className="inline-flex items-center gap-[6px] px-[12px] py-[4px] bg-brand-blue text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20">
                   <Clock size={14} /> Attendance Point
                </div>
            </div>

            <Card className="w-full max-w-md shadow-2xl border-none p-[32px] rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-brand-blue/5 rounded-bl-[100px] z-0" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-[12px] mb-[32px]">
                        <div className="w-[48px] h-[48px] bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-text-muted">Step 1 of 2</p>
                            <h2 className="text-[18px] font-bold text-brand-navy">Select Your Profile</h2>
                        </div>
                    </div>

                    <div className="space-y-[12px] max-h-[300px] overflow-y-auto pr-[8px] mb-[40px]">
                        {staffList.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => setSelectedStaff(s)}
                                className={`p-[16px] rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                                    selectedStaff?.id === s.id 
                                    ? 'border-brand-blue bg-blue-50 shadow-md' 
                                    : 'border-gray-50 bg-white hover:border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-[12px]">
                                    <div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center font-bold text-[14px] transition-colors ${
                                        selectedStaff?.id === s.id ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-brand-navy">{s.name}</p>
                                        <p className="text-[11px] text-text-muted">{s.position}</p>
                                    </div>
                                </div>
                                {selectedStaff?.id === s.id && <CheckCircle size={20} className="text-brand-blue" />}
                            </div>
                        ))}
                    </div>

                    <Button 
                        size="lg" 
                        fullWidth 
                        disabled={!selectedStaff} 
                        onClick={handleClockIn}
                        className="h-[64px] rounded-2xl text-[16px] shadow-xl shadow-brand-blue/30"
                    >
                        Mark Attendance Now
                    </Button>
                </div>
            </Card>

            <p className="mt-[40px] text-[12px] font-medium text-text-muted flex items-center gap-[8px]">
               <Clock size={14} /> FinSathi Biometric Cloud v1.0
            </p>
        </div>
    );
}
