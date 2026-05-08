import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Loader2, Eye, EyeOff, Lock, Mail, User, Zap, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState({ label: 'None', color: 'bg-slate-200', width: '0%' });

  useEffect(() => {
    const pw = formData.password;
    if (!pw) {
      setStrength({ label: 'None', color: 'bg-slate-200', width: '0%' });
      return;
    }
    
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) setStrength({ label: 'Weak', color: 'bg-red-500', width: '25%' });
    else if (score === 2) setStrength({ label: 'Medium', color: 'bg-yellow-500', width: '50%' });
    else if (score === 3) setStrength({ label: 'Strong', color: 'bg-green-500', width: '75%' });
    else setStrength({ label: 'Very Strong', color: 'bg-emerald-500', width: '100%' });
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      toast.success('Registration successful! Redirecting...', { duration: 2000 });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.details) {
        toast.error(errorData.details[0].message);
      } else {
        toast.error(errorData?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Dark Brand Section */}
      <div className="hidden md:flex md:w-1/2 bg-surface p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        
        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">AI Task Platform</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Start your journey <br />
            <span className="text-brand-500 text-6xl">now.</span>
          </h1>
          <div className="space-y-4 max-w-sm">
            {[
              "High performance text manipulation",
              "Real-time processing logs",
              "Advanced AI analytics",
              "Enterprise-grade security"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 size={18} className="text-brand-500 shrink-0" />
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          Join thousands of developers automating their content.
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="max-w-md w-full space-y-8 my-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Create account</h2>
            <p className="text-slate-500">Sign up in less than a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
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
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
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
                
                {/* Strength Meter */}
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">Strength</span>
                    <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-500`} style={{ width: strength.width }}></div>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {[
                      { met: formData.password.length >= 8, label: '8+ characters' },
                      { met: /[A-Z]/.test(formData.password), label: '1 Uppercase' },
                      { met: /[0-9]/.test(formData.password), label: '1 Number' },
                      { met: /[^A-Za-z0-9]/.test(formData.password), label: 'Special char' }
                    ].map((req, i) => (
                      <li key={i} className={`flex items-center gap-1.5 text-xs ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {req.met ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Started'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
