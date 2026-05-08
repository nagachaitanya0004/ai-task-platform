import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data } = await api.post('/api/auth/login', formData);
      login(data.token, data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Dark Brand Section */}
      <div className="hidden md:flex md:w-1/2 bg-surface p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl -ml-48 -mb-48"></div>
        
        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <span className="text-2xl font-bold tracking-tight">AI Task Platform</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Automate your text <br />
            <span className="text-brand-500 text-6xl">processing</span> with AI.
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            The professional suite for high-performance text manipulation and analysis. 
            Scaling your workflow has never been easier.
          </p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          &copy; 2024 AI Task Platform. Built for performance.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Sign in</h2>
            <p className="text-slate-500">Enter your details to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 group-hover:border-brand-400 transition-colors"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <div className="text-center pt-4">
            <p className="text-slate-600 text-sm">
              New here?{' '}
              <Link to="/register" className="text-brand-600 font-bold hover:underline inline-flex items-center gap-1 group">
                Create account 
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
