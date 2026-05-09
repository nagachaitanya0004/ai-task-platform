import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (!token) return null;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/20 group-hover:bg-brand-700 transition-all">
              <Zap className="text-white fill-white" size={16} />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 uppercase">AI Task Platform</span>
          </Link>
          
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-200/50 hidden sm:flex">
              <div className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-black text-xs">
                {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-bold text-slate-700">
                {user?.username || user?.email?.split('@')[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold text-sm transition-all py-2 px-3 rounded-xl hover:bg-red-50 group"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
