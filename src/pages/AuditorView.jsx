import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Filter, X, Eye, CheckCircle, Layers, Calendar, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import clsx from 'clsx';

export default function AuditorView() {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        brand: 'all',
        programme: 'all',
        platform: 'all'
    });

    const [stats, setStats] = useState({
        totalCompleted: 0,
        totalViews: 0,
        platformData: [],
        brandData: []
    });

    useEffect(() => {
        // Auditor sees all completed tasks
        const q = query(
            collection(db, 'tasks'),
            where('status', '==', 'Completed')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        let filtered = [...tasks];

        // Filter by Date Range
        if (filters.startDate || filters.endDate) {
            filtered = filtered.filter(task => {
                if (!task.due_date) return false;
                const taskDate = task.due_date.toDate();
                taskDate.setHours(0, 0, 0, 0);

                let matchesStart = true;
                let matchesEnd = true;

                if (filters.startDate) {
                    const start = new Date(filters.startDate);
                    start.setHours(0, 0, 0, 0);
                    matchesStart = taskDate >= start;
                }

                if (filters.endDate) {
                    const end = new Date(filters.endDate);
                    end.setHours(0, 0, 0, 0);
                    matchesEnd = taskDate <= end;
                }

                return matchesStart && matchesEnd;
            });
        }

        // Filter by Brand
        if (filters.brand !== 'all') {
            filtered = filtered.filter(task => task.brand === filters.brand);
        }

        // Filter by Programme
        if (filters.programme !== 'all') {
            filtered = filtered.filter(task => task.program === filters.programme);
        }

        // Filter by Platform
        if (filters.platform !== 'all') {
            filtered = filtered.filter(task => task.platform && task.platform.includes(filters.platform));
        }

        setFilteredTasks(filtered);
        calculateStats(filtered);
    }, [tasks, filters]);

    const calculateStats = (currentTasks) => {
        let totalCompleted = currentTasks.length;
        let totalViews = 0;
        const platformCounts = { Youtube: 0, Facebook: 0, Tiktok: 0 };
        const brandCounts = {};

        currentTasks.forEach(task => {
            // Views
            const views = task.view_counts || {};
            totalViews += (views.youtube || 0) + (views.facebook || 0) + (views.tiktok || 0);

            platformCounts.Youtube += (views.youtube || 0);
            platformCounts.Facebook += (views.facebook || 0);
            platformCounts.Tiktok += (views.tiktok || 0);

            // Brand
            if (task.brand) {
                brandCounts[task.brand] = (brandCounts[task.brand] || 0) + 1;
            }
        });

        const platformData = Object.keys(platformCounts).map(key => ({ name: key, views: platformCounts[key] }));
        const brandData = Object.keys(brandCounts).map(key => ({ name: key, tasks: brandCounts[key] }));

        setStats({
            totalCompleted,
            totalViews,
            platformData,
            brandData
        });
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            brand: 'all',
            programme: 'all',
            platform: 'all'
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading auditor view...</div>;

    return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gradient mb-2">Auditor Dashboard</h1>
                <p className="text-slate-500">Overview of completed tasks and performance</p>
            </div>

            {/* Filters Section */}
            <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <Filter size={20} className="text-indigo-600" />
                        Filters
                    </h3>
                    <button
                        onClick={handleClearFilters}
                        className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                        <X size={16} />
                        Clear All
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Brand Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Brand</label>
                        <select
                            value={filters.brand}
                            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Brands</option>
                            {[...new Set(tasks.map(t => t.brand).filter(Boolean))].map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    {/* Programme Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Programme</label>
                        <select
                            value={filters.programme}
                            onChange={(e) => setFilters({ ...filters, programme: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Programmes</option>
                            {[...new Set(tasks.map(t => t.program).filter(Boolean))].map(programme => (
                                <option key={programme} value={programme}>{programme}</option>
                            ))}
                        </select>
                    </div>

                    {/* Platform Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Platform</label>
                        <select
                            value={filters.platform}
                            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Platforms</option>
                            <option value="Youtube">Youtube</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Tiktok">Tiktok</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Mini Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <CheckCircle className="text-green-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Completed Tasks</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalCompleted}</h3>
                    <p className="text-sm text-slate-500 mt-1">Based on current filters</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Eye className="text-purple-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Total Views</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalViews.toLocaleString()}</h3>
                    <p className="text-sm text-slate-500 mt-1">Across all platforms</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Views by Platform */}
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <h3 className="font-bold text-xl text-gradient mb-4">Views by Platform</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.platformData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} />
                                <YAxis tick={{ fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}
                                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                />
                                <Bar dataKey="views" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#475569', fontWeight: 'bold' }}>
                                    {stats.platformData.map((entry, index) => {
                                        let color = '#64748b';
                                        if (entry.name === 'Youtube') color = '#FF0000';
                                        if (entry.name === 'Facebook') color = '#1877F2';
                                        if (entry.name === 'Tiktok') color = '#000000';
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tasks by Brand */}
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.4s' }}>
                    <h3 className="font-bold text-xl text-gradient mb-4">Tasks by Brand</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.brandData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                />
                                <YAxis tick={{ fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}
                                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                />
                                <Bar dataKey="tasks" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#475569', fontWeight: 'bold' }}>
                                    {stats.brandData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / stats.brandData.length}, 70%, 60%)`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Filtered Tasks Table */}
            <div className="card-glass rounded-2xl shadow-premium overflow-hidden animate-slideUp" style={{ animationDelay: '0.5s' }}>
                <div className="p-6 border-b border-white/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="font-bold text-xl text-gradient">Completed Tasks Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Date Created</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Programme</th>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4 text-right">YT Views</th>
                                <th className="px-6 py-4 text-right">FB Views</th>
                                <th className="px-6 py-4 text-right">TT Views</th>
                                <th className="px-6 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-600">
                                        {task.created_at?.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {task.due_date?.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.program}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.brand}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {task.platform?.map(p => (
                                                <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                                        {task.view_counts?.youtube?.toLocaleString() || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                                        {task.view_counts?.facebook?.toLocaleString() || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                                        {task.view_counts?.tiktok?.toLocaleString() || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                        {((task.view_counts?.youtube || 0) +
                                            (task.view_counts?.facebook || 0) +
                                            (task.view_counts?.tiktok || 0)).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        No completed tasks found matching filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
