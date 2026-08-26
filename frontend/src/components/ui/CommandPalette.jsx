import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useCommandStore } from '../../store/commandStore';
import { 
  Search, FileText, UserPlus, PackagePlus, BarChart3, 
  Settings, CreditCard, Users, LayoutDashboard, ShoppingCart,
  DollarSign, Package, Truck, ShieldAlert, Bot
} from 'lucide-react';
import './CommandPalette.css';

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
    { id: 'nav-dashboard', title: 'Dashboard Overview', icon: <LayoutDashboard size={16} />, action: () => navigate('/dashboard') },
    { id: 'nav-billing', title: 'POS Billing Register', icon: <ShoppingCart size={16} />, action: () => navigate('/billing') },
    { id: 'nav-invoices', title: 'Invoice Ledger', icon: <FileText size={16} />, action: () => navigate('/invoice-history') },
    { id: 'nav-inventory', title: 'Stock & Inventory', icon: <Package size={16} />, action: () => navigate('/inventory') },
    { id: 'nav-customers', title: 'Customer Registry & Khata', icon: <Users size={16} />, action: () => navigate('/customers') },
    { id: 'nav-suppliers', title: 'Purchases & Suppliers', icon: <Truck size={16} />, action: () => navigate('/suppliers') },
    { id: 'nav-payments', title: 'Payments Inflow', icon: <DollarSign size={16} />, action: () => navigate('/payments') },
    { id: 'nav-expenses', title: 'Expenses Outflow', icon: <BarChart3 size={16} />, action: () => navigate('/expenses') },
    { id: 'nav-pnl', title: 'P&L Financials', icon: <BarChart3 size={16} />, action: () => navigate('/pnl') },
    { id: 'nav-staff', title: 'Staff Hub & Roles', icon: <Users size={16} />, action: () => navigate('/staff') },
    { id: 'nav-ai', title: 'AI Copilot (KaroBar AI)', icon: <Bot size={16} />, action: () => navigate('/ai-advisor') },
    { id: 'nav-settings', title: 'Business Settings', icon: <Settings size={16} />, action: () => navigate('/settings') },
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
        <div className="flex items-center px-4 border-b border-app-border">
          <Search className="text-app-text-muted mr-2.5" size={17} />
          <Command.Input 
            placeholder="Type a command or search sections..." 
            className="w-full bg-transparent text-app-text border-0 focus:ring-0 placeholder:text-app-text-muted py-3.5 text-body outline-none"
            autoFocus
          />
        </div>

        <Command.List className="max-h-[320px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-8 text-center text-small text-app-text-muted">
            No commands or matching records found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="text-micro font-semibold text-app-text-muted uppercase tracking-wider px-2 py-1.5">
            {defaultCommands.map((item) => (
              <Command.Item
                key={item.id}
                onSelect={() => handleSelect(item.action)}
                className="flex items-center px-3 py-2.5 rounded-btn text-small text-app-text cursor-pointer hover:bg-app-surface-secondary transition-colors aria-selected:bg-app-primary-subtle aria-selected:text-app-primary"
              >
                <div className="mr-3 text-app-text-muted shrink-0">{item.icon}</div>
                <span className="font-medium truncate">{item.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
          
          {commands.length > 0 && (
            <Command.Group heading="Page Actions" className="text-micro font-semibold text-app-text-muted uppercase tracking-wider px-2 py-1.5 mt-2">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.action)}
                  className="flex items-center px-3 py-2.5 rounded-btn text-small text-app-text cursor-pointer hover:bg-app-surface-secondary transition-colors aria-selected:bg-app-primary-subtle aria-selected:text-app-primary"
                >
                  <div className="mr-3 text-app-text-muted shrink-0">{cmd.icon || <FileText size={16} />}</div>
                  <span className="font-medium truncate">{cmd.title}</span>
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
