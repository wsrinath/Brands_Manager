import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Calendar, CheckSquare, Settings, LogOut, User, History, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export default function Layout({ children }) {
    const { logout, userRole, userName } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', role: 'Admin' },
        { icon: LayoutDashboard, label: 'Marketing Dashboard', path: '/marketing-dashboard', role: 'Marketing' },

        { icon: Calendar, label: 'Schedule', path: '/schedule', role: ['Admin', 'Scheduler'] },
        { icon: CheckSquare, label: 'Total Tasks', path: '/tasks', role: ['Admin', 'Editor', 'Scheduler', 'Auditor'] },
        { icon: BarChart2, label: 'Compare', path: '/compare', role: ['Admin', 'Editor', 'Scheduler', 'Auditor'] },
        { icon: LayoutDashboard, label: 'Kanban', path: '/kanban', role: ['Admin', 'Scheduler', 'Editor'] },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: History, label: 'Task History', path: '/history', role: ['Scheduler', 'Editor', 'Admin'] },
        { icon: CheckSquare, label: 'Review', path: '/review', role: ['Admin', 'Scheduler'] },
        { icon: Settings, label: 'Admin', path: '/admin', role: 'Admin' },
    ];

    console.log('Current userRole in Layout:', userRole);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Glassmorphic Sidebar */}
            <div className="w-64 card-glass border-r border-white/20 flex flex-col shadow-premium">
                <div className="p-6 border-b border-white/20">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <img src="/hirulogo.png" alt="Hiru Logo" className="w-10 h-10 object-contain rounded-lg shadow-glow" />
                        <span className="text-gradient">Hiru Media Flow</span>
                    </h1>
                    {userName && (
                        <p className="text-sm text-slate-600 mt-2 font-medium">Welcome, {userName}</p>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        // Role-based filtering (case-insensitive)
                        if (item.role) {
                            const roles = Array.isArray(item.role) ? item.role : [item.role];
                            const userRoleLower = userRole?.toLowerCase();
                            const rolesLower = roles.map(r => r.toLowerCase());
                            if (!rolesLower.includes(userRoleLower)) return null;
                        }

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3.5 w-full text-left text-sm font-bold rounded-xl transition-all duration-300 group",
                                    location.pathname === item.path
                                        ? "gradient-primary text-white shadow-premium scale-[1.02]"
                                        : "text-slate-600 hover:bg-white/60 hover:text-indigo-600 hover:shadow-sm hover:pl-5"
                                )}
                            >
                                <item.icon size={20} className={clsx(
                                    "transition-transform duration-300",
                                    location.pathname !== item.path && "group-hover:scale-110"
                                )} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/20 space-y-2 bg-white/10 backdrop-blur-md">
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-bold text-slate-700 hover:bg-white/60 hover:text-indigo-600 rounded-xl transition-all hover:shadow-sm group"
                    >
                        <User size={20} className="group-hover:scale-110 transition-transform" />
                        Profile
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all hover:shadow-sm group"
                    >
                        <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="p-8 animate-fadeIn">
                    {children || <Outlet />}
                </div>
            </div>
        </div>
    );
}
