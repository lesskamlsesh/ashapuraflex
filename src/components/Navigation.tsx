import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, DollarSign, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/dashboard/admin', icon: Settings, label: 'Admin' },
    { to: '/dashboard/manager', icon: Users, label: 'Manager' },
    { to: '/dashboard/designer', icon: Palette, label: 'Designer' },
    { to: '/dashboard/finance', icon: DollarSign, label: 'Finance' },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1 md:space-x-4">
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              AshapuraFlex
            </h1>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center space-y-1 px-3 py-2 rounded-md text-xs transition-colors min-w-fit",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;