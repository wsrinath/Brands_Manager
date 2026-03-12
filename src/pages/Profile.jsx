import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Save, ArrowLeft } from 'lucide-react';

export default function Profile() {
    const { currentUser, userName } = useAuth();
    const [name, setName] = useState(userName || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setMessage({ type: 'error', text: 'Name cannot be empty' });
            return;
        }

        setSaving(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                name: name.trim()
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn">
            <div className="max-w-md w-full card-glass rounded-2xl shadow-premium p-8 animate-slideUp">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-500/30 transform hover:scale-105 transition-transform duration-300">
                        <User size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">Complete Your Profile</h2>
                    <p className="text-slate-600 font-medium">Set your display name to personalize your experience</p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center justify-center font-bold ${message.type === 'success' ? 'bg-green-50/80 text-green-700 border border-green-100' : 'bg-red-50/80 text-red-700 border border-red-100'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Go Back"
                >
                    <ArrowLeft size={24} />
                </button>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-medium">This name will be displayed throughout the app</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            disabled
                            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl bg-slate-50/50 text-slate-500 font-medium cursor-not-allowed"
                            value={currentUser?.email}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-lg hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
