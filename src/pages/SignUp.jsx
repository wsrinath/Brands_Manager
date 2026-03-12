import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus, Sparkles, Zap, ArrowLeft } from 'lucide-react';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        try {
            setError('');
            setLoading(true);

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                name: name || email.split('@')[0],
                role: 'editor', // Default role
                created_at: new Date()
            });

            navigate('/admin');
        } catch (err) {
            setError('Failed to create account: ' + err.message);
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

            {/* Sign Up Card */}
            <div className="relative max-w-md w-full animate-fadeIn">
                {/* Back to Login */}
                <button
                    onClick={() => navigate('/admin')}
                    className="mb-4 flex items-center gap-2 text-white hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Admin Panel</span>
                </button>

                {/* Glassmorphic Card */}
                <div className="card-glass p-8 rounded-2xl shadow-premium-lg">
                    {/* Logo/Icon */}
                    <div className="text-center mb-8">
                        <div className="relative inline-block">
                            <div className="w-16 h-16 gradient-success rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-glow animate-glow">
                                <UserPlus size={32} className="animate-pulse-slow" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles size={14} className="text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Create Account
                        </h2>
                        <p className="text-slate-700 font-medium">Join the MediaFlow team</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-900 font-semibold p-4 rounded-xl mb-6 text-sm animate-slideUp">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="animate-slideUp" style={{ animationDelay: '0.3s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="animate-slideUp" style={{ animationDelay: '0.4s' }}>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-success text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-premium transform hover:scale-[1.02] active:scale-[0.98] animate-slideUp"
                            style={{ animationDelay: '0.5s' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating Account...
                                </span>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                        <p className="text-slate-700 text-sm">
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-purple-600 font-bold hover:text-purple-700 transition-colors"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>

                {/* Bottom Glow */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-green-500/30 rounded-full filter blur-3xl"></div>
            </div>
        </div>
    );
}
