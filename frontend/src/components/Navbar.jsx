import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bot } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <Bot className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-gray-900">AI Task Platform</span>
          </Link>
          
          {user && (
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hidden sm:block">
                Welcome, {user.username || user.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-gray-500 hover:text-red-600 font-medium text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
