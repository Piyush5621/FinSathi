import logoImg from '../assets/logo.png';

const Logo = ({ collapsed = false }) => {
  return (
    <div className={`flex items-center gap-2.5 transition-all duration-300 ${collapsed ? 'justify-center w-full' : ''}`}>
      {/* Official FinSathi logo icon */}
      <div className={`
        shrink-0 flex items-center justify-center
        ${collapsed ? 'w-10 h-10' : 'w-9 h-9'}
      `}>
        <img
          src={logoImg}
          alt="FinSathi"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      {/* Brand Name - Hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black text-white tracking-tight leading-none">
            FinSathi
          </span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">
            Business OS
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
