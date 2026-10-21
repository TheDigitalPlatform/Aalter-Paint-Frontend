import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, LogOut, ChevronDown, Shield } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1A1A1A] text-white flex flex-col shrink-0 shadow-lg border-r border-[#DADADA]">
        {/* Sidebar Header with Image Logo */}
        <div className="p-4 border-b border-[#DADADA] flex flex-col items-center justify-center bg-white">
          <img 
            src="/logo.png" 
            alt="Aalterpaint Logo" 
            className="h-12 object-contain"
          />
          <div className="text-center mt-1">
            <span className="block font-bold text-sm text-[#242424] leading-tight">Orderverwerking</span>
            <span className="block text-[11px] text-[#4D4D4D]">AI-orderassistent</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-4 px-3 space-y-1 flex-1">
          <a 
            href="#" 
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold uppercase tracking-wider rounded-none bg-[#E20714] text-white transition-all shadow-sm"
          >
            <Home size={18} />
            <span>Overzicht</span>
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F5]">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#DADADA] flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B6B6B]">Aalterpaint</span>
            <span className="text-sm text-[#DADADA]">/</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">Dashboard</span>
          </div>

          {/* Header Actions & Profile */}
          <div className="flex items-center gap-4">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-50 rounded-xl transition-all duration-200 cursor-pointer border border-transparent active:border-slate-100"
              >
                {/* Avatar with Status Dot */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner">
                    <img 
                      src="/logo.png" 
                      alt="User Avatar" 
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>

                {/* User Info (hidden on mobile) */}
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-slate-700 leading-tight">
                    {user?.name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                    {user?.email || 'authenticated'}
                  </p>
                </div>

                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-none shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{user?.email || 'User'}</p>
                    {user?.role && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-semibold bg-[#FCE8E8] text-[#E20714] rounded-none">
                        <Shield size={10} />
                        {user.role.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Sign Out Action */}
                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-[#E20714] hover:bg-[#FCE8E8] rounded-none transition-all cursor-pointer text-left uppercase tracking-wider"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-8 overflow-y-auto bg-[#F5F5F5]">
          {/* Welcome Banner */}
          <div className="bg-[#1A1A1A] rounded-none p-8 text-white shadow-sm relative overflow-hidden mb-8 border-t-4 border-[#E20714]">
            <div className="relative z-10 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E20714] block mb-2">Aalterpaint Orderverwerking</span>
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome, {user?.name || user?.email || user?.id?.split('@')[0] || 'User'}!
              </h2>
              <p className="text-gray-300 mt-2 text-sm md:text-base leading-relaxed">
                AI-orderassistent voor geautomatiseerde orderverwerking, e-mail extractie en validatie.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
