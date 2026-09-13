import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Building, MapPin, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { UserRole } from '../../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, error, clearError, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('officer');
  const [departmentName, setDepartmentName] = useState('Public Works & Infrastructure');
  const [ward, setWard] = useState('Zone 2 Command');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);
    if (!email || !password) return;

    const res = await signIn(email, password);
    if (res.success) {
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);
    if (!signupEmail || !signupPassword) return;

    const res = await signUp(signupEmail, signupPassword, {
      fullName,
      role,
      departmentName,
      ward,
    });

    if (res.success) {
      setSuccessMsg('Account registered successfully. You can now sign in.');
      setMode('signin');
      setEmail(signupEmail);
      setPassword(signupPassword);
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    clearError();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl bg-white border border-[#D9E2EC] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Shield className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">CivicResolve Security</h2>
              <p className="text-xs text-blue-100 font-medium">Municipal Officer & Citizen Auth</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearError();
              onClose();
            }}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#D9E2EC] bg-slate-50 text-xs font-semibold text-[#526581]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              clearError();
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              mode === 'signin'
                ? 'border-[#1769D2] bg-white text-[#123B6D]'
                : 'border-transparent hover:text-[#172B4D]'
            }`}
          >
            Municipal Officer Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              clearError();
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              mode === 'signup'
                ? 'border-[#1769D2] bg-white text-[#123B6D]'
                : 'border-transparent hover:text-[#172B4D]'
            }`}
          >
            Register New Account
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1.5">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@civicresolve.gov"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#718096] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              {/* Demo Pre-fill helpers */}
              <div className="pt-1">
                <div className="text-[11px] font-medium text-[#718096] mb-1.5">Quick Demo Logins:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('duty.officer@civicresolve.gov', 'civic123456')}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-[#123B6D] hover:bg-blue-50 hover:text-[#1769D2] transition-colors border border-slate-200"
                  >
                    Zone 2 Duty Officer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@civicresolve.gov', 'admin123456')}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-[#123B6D] hover:bg-blue-50 hover:text-[#1769D2] transition-colors border border-slate-200"
                  >
                    Municipal Admin
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-[#1769D2] hover:bg-[#1255AA] text-white py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#718096] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Saurabh Sharma"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#718096] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="officer.name@civicresolve.gov"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#718096] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 px-2 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  >
                    <option value="officer">Field Officer</option>
                    <option value="dept_admin">Dept Admin</option>
                    <option value="municipal_admin">Municipal Admin</option>
                    <option value="citizen">Citizen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">Ward / Command</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#718096] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      placeholder="Zone 2"
                      className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-7 pr-2 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">Department</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-[#718096] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Department Name"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-7 pr-2 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1769D2]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-[#1769D2] hover:bg-[#1255AA] text-white py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Register Supabase Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
