import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Sparkles, Zap } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError('Failed to sign in: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            </div>

            {/* Floating Shapes */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>

            {/* Login Card */}
            <div className="relative max-w-md w-full animate-fadeIn">
                {/* Glassmorphic Card */}
                <div className="card-glass p-8 rounded-2xl shadow-premium-lg">
                    {/* Logo/Icon */}
                    <div className="text-center mb-8">
                        <div className="relative inline-block">
                            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-glow animate-glow">
                                <Sparkles size={32} className="animate-pulse-slow" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                                <Zap size={14} className="text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-slate-700 font-medium">Sign in to access your workspace</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-900 font-semibold p-4 rounded-xl mb-6 text-sm animate-slideUp">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-purple-600 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-premium transform hover:scale-[1.02] active:scale-[0.98] animate-slideUp"
                            style={{ animationDelay: '0.3s' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                        <p className="text-slate-900 font-bold text-lg">
                            MediaFlow Brand Manager
                        </p>
                        <p className="text-sm text-slate-600 font-bold mt-3">
                            Powered by Lotus AI R&D Team
                        </p>
                    </div>
                </div>

                {/* Bottom Glow */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-purple-500/30 rounded-full filter blur-3xl"></div>
            </div>
        </div>
    );
}
