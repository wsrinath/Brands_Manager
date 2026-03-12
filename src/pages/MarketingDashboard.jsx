import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, CheckCircle, Eye, Clock, RefreshCw, Filter, X, TrendingUp, Award } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function MarketingDashboard() {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userNames, setUserNames] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        brand: 'all',
        dateRange: 'all',
        customDate: ''
    });
    const [stats, setStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        totalViews: 0,
        avgViewsPerTask: 0,
        brandPerformance: [],
        platformDistribution: [],
        topPerforming: []
    });

    const calculateMarketingStats = (currentTasks) => {
        const totalTasks = currentTasks.length;
        const completedTasks = currentTasks.filter(t => t.status === 'Completed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate total views
        const totalViews = currentTasks.reduce((sum, task) => {
            return sum + (task.view_counts?.youtube || 0) +
                (task.view_counts?.facebook || 0) +
                (task.view_counts?.tiktok || 0);
        }, 0);

        const avgViewsPerTask = totalTasks > 0 ? Math.round(totalViews / totalTasks) : 0;

        // Brand performance
        const brandStats = {};
        currentTasks.forEach(task => {
            if (!brandStats[task.brand]) {
                brandStats[task.brand] = { name: task.brand, views: 0, tasks: 0 };
            }
            brandStats[task.brand].tasks++;
            brandStats[task.brand].views += (task.view_counts?.youtube || 0) +
                (task.view_counts?.facebook || 0) +
                (task.view_counts?.tiktok || 0);
        });

        // Platform distribution
        const platformStats = [
            { name: 'YouTube', views: currentTasks.reduce((sum, t) => sum + (t.view_counts?.youtube || 0), 0) },
            { name: 'Facebook', views: currentTasks.reduce((sum, t) => sum + (t.view_counts?.facebook || 0), 0) },
            { name: 'TikTok', views: currentTasks.reduce((sum, t) => sum + (t.view_counts?.tiktok || 0), 0) }
        ];

        // Top performing content
        const topPerforming = [...currentTasks]
            .map(task => ({
                ...task,
                totalViews: (task.view_counts?.youtube || 0) +
                    (task.view_counts?.facebook || 0) +
                    (task.view_counts?.tiktok || 0)
            }))
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, 10);

        setStats({
            totalTasks,
            completedTasks,
            completionRate,
            totalViews,
            avgViewsPerTask,
            brandPerformance: Object.values(brandStats),
            platformDistribution: platformStats,
            topPerforming
        });
    };

    useEffect(() => {
        const q = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
            setFilteredTasks(tasksData);
            calculateMarketingStats(tasksData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Apply filters whenever tasks or filters change
    useEffect(() => {
        let filtered = [...tasks];

        // Filter by status
        if (filters.status !== 'all') {
            filtered = filtered.filter(task => task.status === filters.status);
        }

        // Filter by brand
        if (filters.brand !== 'all') {
            filtered = filtered.filter(task => task.brand === filters.brand);
        }

        // Filter by date range
        if (filters.dateRange !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            filtered = filtered.filter(task => {
                if (!task.created_at) return false;
                const taskDate = task.created_at.toDate();

                switch (filters.dateRange) {
                    case 'today':
                        return taskDate >= startOfToday;
                    case 'week':
                        return taskDate >= startOfWeek;
                    case 'month':
                        return taskDate >= startOfMonth;
                    case 'custom':
                        if (!filters.customDate) return true;
                        const customDateStart = new Date(filters.customDate);
                        return taskDate.toDateString() === customDateStart.toDateString();
                    default:
                        return true;
                }
            });
        }

        setFilteredTasks(filtered);
        calculateMarketingStats(filtered);
    }, [tasks, filters]);

    const handleRefreshViews = async () => {
        setRefreshing(true);
        try {
            const tasksWithLinks = tasks.filter(task => task.editor_links && (task.editor_links.youtube || task.editor_links.facebook || task.editor_links.tiktok));

            for (const task of tasksWithLinks) {
                const viewCounts = { youtube: 0, facebook: 0, tiktok: 0 };

                const fetchViews = async (url) => {
                    if (!url) return 0;
                    try {
                        // Check if it's a YouTube URL
                        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

                        if (isYouTube) {
                            // Use new API for YouTube
                            const apiUrl = `https://us-central1-sheetbot-475711.cloudfunctions.net/get_youtube_views?url=${encodeURIComponent(url)}`;
                            const response = await fetch(apiUrl);
                            const data = await response.json();
                            return data.views || data.view_count || 0;
                        } else {
                            // Use old API for TikTok/Facebook
                            const apiUrl = `https://video-api-801394283865.us-central1.run.app/views?url=${encodeURIComponent(url)}`;
                            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
                            const response = await fetch(proxyUrl);
                            const data = await response.json();
                            return data.view_count || 0;
                        }
                    } catch (err) {
                        console.error("Error fetching views for:", url, err);
                        return 0;
                    }
                };

                if (task.editor_links.youtube) viewCounts.youtube = await fetchViews(task.editor_links.youtube);
                if (task.editor_links.facebook) viewCounts.facebook = await fetchViews(task.editor_links.facebook);
                if (task.editor_links.tiktok) viewCounts.tiktok = await fetchViews(task.editor_links.tiktok);

                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, {
                    view_counts: viewCounts
                });
            }
            alert('Views refreshed successfully!');
        } catch (error) {
            console.error("Error refreshing views:", error);
            alert('Error refreshing views. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleExportToExcel = async () => {
        // Prepare data for export
        const exportData = filteredTasks.map(task => ({
            'Date Created': task.created_at?.toDate().toLocaleDateString() || 'N/A',
            'Due Date': task.due_date?.toDate().toLocaleDateString() || 'N/A',
            'Programme': task.program || 'N/A',
            'Brand': task.brand || 'N/A',
            'Platform': task.platform?.join(', ') || 'N/A',
            'YouTube Views': task.view_counts?.youtube || 0,
            'Facebook Views': task.view_counts?.facebook || 0,
            'TikTok Views': task.view_counts?.tiktok || 0,
            'Total Views': (task.view_counts?.youtube || 0) + (task.view_counts?.facebook || 0) + (task.view_counts?.tiktok || 0),
            'Status': task.status || 'N/A'
        }));

        // Create worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Report');

        // Generate filename with current date
        const filename = `Marketing_Dashboard_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);
    };

    const handleClearFilters = () => {
        setFilters({
            status: 'all',
            brand: 'all',
            dateRange: 'all',
            customDate: ''
        });
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) return <div className="p-8 text-center text-slate-500">Loading marketing dashboard...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
                <div>
                    <h1 className="text-4xl font-bold text-gradient mb-2">Marketing Dashboard</h1>
                    <p className="text-slate-500">Campaign performance and analytics</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshViews}
                        disabled={refreshing}
                        className={clsx(
                            "btn-secondary flex items-center gap-2",
                            refreshing && "opacity-75 cursor-not-allowed"
                        )}
                    >
                        <RefreshCw size={18} className={clsx(refreshing && "animate-spin")} />
                        {refreshing ? 'Refreshing...' : 'Refresh Views'}
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Download size={18} />
                        Export to Excel
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.05s' }}>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In_Review">In Review</option>
                            <option value="Completed">Completed</option>
                        </select>
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

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Date Range</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Date</option>
                        </select>
                    </div>

                    {/* Custom Date Picker */}
                    {filters.dateRange === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Select Date</label>
                            <input
                                type="date"
                                value={filters.customDate}
                                onChange={(e) => setFilters({ ...filters, customDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <BarChart3 className="text-blue-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Total Tasks</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalTasks}</h3>
                    <p className="text-sm text-slate-500 mt-1">{stats.completedTasks} completed</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <TrendingUp className="text-green-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Completion Rate</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.completionRate}%</h3>
                    <p className="text-sm text-slate-500 mt-1">Task completion</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Eye className="text-purple-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Total Views</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalViews.toLocaleString()}</h3>
                    <p className="text-sm text-slate-500 mt-1">All platforms</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl">
                            <Award className="text-orange-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Avg Views/Task</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.avgViewsPerTask.toLocaleString()}</h3>
                    <p className="text-sm text-slate-500 mt-1">Performance metric</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Brand Performance */}
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.5s' }}>
                    <h3 className="font-bold text-xl text-gradient mb-4">Brand Performance</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.brandPerformance}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform Distribution */}
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.6s' }}>
                    <h3 className="font-bold text-xl text-gradient mb-4">Platform Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.platformDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="views"
                                    label
                                >
                                    {stats.platformDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Performing Content */}
            <div className="card-glass rounded-2xl shadow-premium overflow-hidden animate-slideUp" style={{ animationDelay: '0.7s' }}>
                <div className="p-6 border-b border-white/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="font-bold text-xl text-gradient">Top Performing Content</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Programme</th>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4 text-right">Total Views</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.topPerforming.map((task, index) => (
                                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-indigo-600">#{index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.brand}</td>
                                    <td className="px-6 py-4 text-slate-600">{task.program}</td>
                                    <td className="px-6 py-4 text-slate-600">{task.platform?.join(', ')}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                                        {task.totalViews.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            task.status === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                                                task.status === 'Assigned' ? "bg-blue-100 text-blue-700" :
                                                    task.status === 'In_Review' ? "bg-purple-100 text-purple-700" :
                                                        "bg-green-100 text-green-700"
                                        )}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
