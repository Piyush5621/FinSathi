import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useCommandStore } from '../../store/commandStore';
import { 
  Search, FileText, UserPlus, PackagePlus, BarChart3, 
  Settings, CreditCard, Users, LayoutDashboard 
} from 'lucide-react';
import './CommandPalette.css'; // Add styling for cmdk

const CommandPalette = () => {
  const navigate = useNavigate();
  const { isOpen, setOpen, toggle, commands } = useCommandStore();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle]);

  const handleSelect = (action) => {
    setOpen(false);
    action();
  };

  // Default global commands
  const defaultCommands = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: <LayoutDashboard size={16} />, action: () => navigate('/dashboard') },
    { id: 'nav-billing', title: 'Open Billing', icon: <CreditCard size={16} />, action: () => navigate('/billing') },
    { id: 'nav-inventory', title: 'View Inventory', icon: <PackagePlus size={16} />, action: () => navigate('/inventory') },
    { id: 'nav-customers', title: 'Manage Customers', icon: <Users size={16} />, action: () => navigate('/customers') },
    { id: 'nav-staff', title: 'Staff Hub', icon: <Users size={16} />, action: () => navigate('/staff') },
    { id: 'nav-expenses', title: 'Expenses', icon: <BarChart3 size={16} />, action: () => navigate('/expenses') },
    { id: 'nav-pnl', title: 'Profit & Loss', icon: <BarChart3 size={16} />, action: () => navigate('/pnl') },
    { id: 'nav-general', title: 'General Hub', icon: <Settings size={16} />, action: () => navigate('/general') },
    { id: 'nav-settings', title: 'Settings & Profile', icon: <Settings size={16} />, action: () => navigate('/settings') },
  ];

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="cmdk-dialog"
    >
      <div className="cmdk-overlay" onClick={() => setOpen(false)} />
      
      <div className="cmdk-content">
        <div className="flex items-center px-4 border-b border-gray-800">
          <Search className="text-gray-400 mr-2" size={18} />
          <Command.Input 
            placeholder="Type a command or search..." 
            className="w-full bg-transparent text-white border-0 focus:ring-0 placeholder-gray-500 py-4 outline-none"
            autoFocus
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="py-6 text-center text-sm text-gray-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
            {defaultCommands.map((item) => (
              <Command.Item
                key={item.id}
                onSelect={() => handleSelect(item.action)}
                className="flex items-center px-3 py-3 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-blue-600/20 hover:text-white ui-selected:bg-blue-600/20 ui-selected:text-white transition-colors aria-selected:bg-blue-600/20 aria-selected:text-white"
              >
                <div className="mr-3 text-gray-400">{item.icon}</div>
                {item.title}
              </Command.Item>
            ))}
          </Command.Group>
          
          {commands.length > 0 && (
            <Command.Group heading="Page Actions" className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2 mt-2">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.action)}
                  className="flex items-center px-3 py-3 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-blue-600/20 hover:text-white aria-selected:bg-blue-600/20 aria-selected:text-white transition-colors"
                >
                  <div className="mr-3 text-gray-400">{cmd.icon || <FileText size={16} />}</div>
                  {cmd.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

        </Command.List>
      </div>
    </Command.Dialog>
  );
};

export default CommandPalette;
