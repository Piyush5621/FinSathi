import { useEffect, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useCommandStore } from '../../store/commandStore';
import { Search, FileText } from 'lucide-react';
import { getSearchableCommands } from '../../constants/navigation';
import './CommandPalette.css';

const CommandPalette = () => {
  const navigate = useNavigate();
  const { isOpen, setOpen, toggle, commands } = useCommandStore();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleCommands = useMemo(() => {
    return getSearchableCommands(currentUser, navigate);
  }, [currentUser?.role, JSON.stringify(currentUser?.permissions), navigate]);

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

  // Group commands by domain
  const groupedCommands = useMemo(() => {
    return roleCommands.reduce((acc, cmd) => {
      const cat = cmd.category || 'Navigation';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    }, {});
  }, [roleCommands]);

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
          <Search className="text-app-text-muted mr-2.5 shrink-0" size={17} />
          <Command.Input 
            placeholder="Type a command, module, or search features..." 
            className="w-full bg-transparent text-app-text border-0 focus:ring-0 placeholder:text-app-text-muted py-3.5 text-body outline-none"
            autoFocus
          />
        </div>

        <Command.List className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-8 text-center text-small text-app-text-muted">
            No matching commands, pages, or features found.
          </Command.Empty>

          {Object.entries(groupedCommands).map(([category, items]) => (
            <Command.Group 
              key={category} 
              heading={category} 
              className="text-micro font-bold text-app-text-muted uppercase tracking-wider px-2 py-1.5"
            >
              {items.map((item) => {
                const Icon = item.icon || FileText;
                return (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.description || ''} ${category}`}
                    onSelect={() => handleSelect(item.action)}
                    className="flex items-center justify-between px-3 py-2 rounded-btn text-small text-app-text cursor-pointer hover:bg-app-surface-secondary transition-colors aria-selected:bg-app-primary-subtle aria-selected:text-app-primary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-app-text-muted shrink-0">
                        <Icon size={16} />
                      </div>
                      <span className="font-medium truncate">{item.title}</span>
                    </div>

                    {item.description && (
                      <span className="text-micro text-app-text-muted truncate max-w-[200px] hidden sm:inline ml-2">
                        {item.description}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
          
          {commands.length > 0 && (
            <Command.Group heading="Page Actions" className="text-micro font-bold text-app-text-muted uppercase tracking-wider px-2 py-1.5 mt-2">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={cmd.title}
                  onSelect={() => handleSelect(cmd.action)}
                  className="flex items-center px-3 py-2 rounded-btn text-small text-app-text cursor-pointer hover:bg-app-surface-secondary transition-colors aria-selected:bg-app-primary-subtle aria-selected:text-app-primary"
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
