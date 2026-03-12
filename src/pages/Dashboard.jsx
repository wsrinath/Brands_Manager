import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, onSnapshot, where, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { BarChart3, CheckCircle, Eye, Clock, RefreshCw, Filter, X, Users, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        pending: 0,
        completedToday: 0,
        totalViews: 0,
        statusData: [],
        platformData: [],
        brandData: [],
        programmeData: []
    });

    const [userStats, setUserStats] = useState([]);
    const [userNames, setUserNames] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        brand: 'all',
        programme: 'all',
        dateRange: 'all',
        startDate: '',
        endDate: ''
    });
    const [filteredTasks, setFilteredTasks] = useState([]);

    const calculateStats = (currentTasks) => {
        let pending = 0;
        let completedToday = 0;
        let totalViews = 0;
        const statusCounts = {};
        const platformCounts = { Youtube: 0, Facebook: 0, Tiktok: 0 };
        const brandCounts = {};
        const programmeCounts = {};

        const today = new Date().toDateString();

        currentTasks.forEach(task => {
            // Status
            if (task.status === 'Pending') pending++;
            if (task.status === 'Completed' && task.updated_at?.toDate().toDateString() === today) {
                completedToday++;
            }

            statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;

            // Views
            const views = task.view_counts || {};

            const ytViews = Array.isArray(views.youtube) ? views.youtube.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(views.youtube) || 0);
            const fbViews = Array.isArray(views.facebook) ? views.facebook.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(views.facebook) || 0);
            const ttViews = Array.isArray(views.tiktok) ? views.tiktok.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(views.tiktok) || 0);

            totalViews += ytViews + fbViews + ttViews;

            platformCounts.Youtube += ytViews;
            platformCounts.Facebook += fbViews;
            platformCounts.Tiktok += ttViews;

            // Brand
            if (task.brand) {
                brandCounts[task.brand] = (brandCounts[task.brand] || 0) + 1;
            }

            // Programme
            if (task.program) {
                programmeCounts[task.program] = (programmeCounts[task.program] || 0) + 1;
            }
        });

        const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
        const platformData = Object.keys(platformCounts).map(key => ({ name: key, views: platformCounts[key] }));
        const brandData = Object.keys(brandCounts).map(key => ({ name: key, tasks: brandCounts[key] }));
        const programmeData = Object.keys(programmeCounts).map(key => ({ name: key, tasks: programmeCounts[key] }));

        setStats({
            pending,
            completedToday,
            totalViews,
            statusData,
            platformData,
            brandData,
            programmeData
        });
    };

    const calculateUserStats = (tasks) => {
        const stats = {};
        tasks.forEach(task => {
            const uid = task.editor_id || 'Unassigned';
            if (!stats[uid]) {
                stats[uid] = { id: uid, assigned: 0, completed: 0, inReview: 0, pending: 0, totalViews: 0 };
            }
            if (task.status === 'Assigned') stats[uid].assigned++;
            if (task.status === 'Completed') stats[uid].completed++;
            if (task.status === 'In_Review') stats[uid].inReview++;
            if (task.status === 'Pending') stats[uid].pending++;

            const viewsData = task.view_counts || {};
            const ytViews = Array.isArray(viewsData.youtube) ? viewsData.youtube.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(viewsData.youtube) || 0);
            const fbViews = Array.isArray(viewsData.facebook) ? viewsData.facebook.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(viewsData.facebook) || 0);
            const ttViews = Array.isArray(viewsData.tiktok) ? viewsData.tiktok.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(viewsData.tiktok) || 0);

            stats[uid].totalViews += (ytViews + fbViews + ttViews);
        });
        setUserStats(Object.values(stats));
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
            calculateStats(tasksData);
            calculateUserStats(tasksData);
            fetchUserNames(tasksData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const fetchUserNames = async (tasks) => {
        const uniqueUserIds = [...new Set(tasks.map(t => t.editor_id).filter(Boolean))];
        const names = {};

        for (const uid of uniqueUserIds) {
            try {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    names[uid] = userDoc.data().name || userDoc.data().email || uid;
                } else {
                    names[uid] = uid;
                }
            } catch (error) {
                console.error('Error fetching user name:', error);
                names[uid] = uid;
            }
        }
        setUserNames(names);
    };

    // Calculate Brand Stats for Charts (Move from Admin)
    const brandStats = React.useMemo(() => {
        const stats = {};
        filteredTasks.forEach(task => {
            if (!task.brand) return;
            if (!stats[task.brand]) {
                stats[task.brand] = { name: task.brand, youtube: 0, facebook: 0, tiktok: 0 };
            }
            if (task.view_counts) {
                const yt = Array.isArray(task.view_counts.youtube) ? task.view_counts.youtube.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(task.view_counts.youtube) || 0);
                const fb = Array.isArray(task.view_counts.facebook) ? task.view_counts.facebook.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(task.view_counts.facebook) || 0);
                const tt = Array.isArray(task.view_counts.tiktok) ? task.view_counts.tiktok.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(task.view_counts.tiktok) || 0);

                stats[task.brand].youtube += yt;
                stats[task.brand].facebook += fb;
                stats[task.brand].tiktok += tt;
            }
        });
        return Object.values(stats).sort((a, b) => (b.youtube + b.facebook + b.tiktok) - (a.youtube + a.facebook + a.tiktok));
    }, [filteredTasks]);

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

        // Filter by programme
        if (filters.programme !== 'all') {
            filtered = filtered.filter(task => task.program === filters.programme);
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            filtered = filtered.filter(task => {
                if (!task.due_date) return false;
                const taskDate = task.due_date.toDate();
                taskDate.setHours(0, 0, 0, 0); // Normalize time

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

        setFilteredTasks(filtered);
        calculateStats(filtered);
        calculateUserStats(filtered);
    }, [tasks, filters]);

    const handleRefreshViews = async () => {
        setRefreshing(true);
        try {
            const getYouTubeLongUrl = (url) => {
                if (!url) return url;
                const s = url.trim();

                let videoId = null;
                if (s.includes('youtu.be/')) {
                    videoId = s.split('youtu.be/')[1].split(/[?&]/)[0];
                } else if (s.includes('/shorts/')) {
                    videoId = s.split('/shorts/')[1].split(/[?&]/)[0];
                } else if (s.includes('youtube.com/watch')) {
                    const vMatch = s.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                    if (vMatch) videoId = vMatch[1];
                }

                const tMatch = s.match(/[?&]t=([0-9a-zA-Z]+)/);
                const tParam = tMatch ? `&t=${tMatch[1]}` : '';

                if (videoId) {
                    return `https://www.youtube.com/watch?v=${videoId}${tParam}`;
                }

                return s;
            };

            const fetchViews = async (url) => {
                if (!url) return 0;
                try {
                    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                    if (isYouTube) {
                        const longUrl = getYouTubeLongUrl(url);
                        console.log('[Dashboard] Fetching YouTube views for:', longUrl);

                        const apiUrl = `https://us-central1-sheetbot-475711.cloudfunctions.net/get_youtube_views?url=${encodeURIComponent(longUrl)}`;
                        console.log('[Dashboard] API URL:', apiUrl);

                        const response = await fetch(apiUrl);
                        console.log('[Dashboard] Response status:', response.status);

                        const text = await response.text();
                        console.log('[Dashboard] Response text:', text);

                        // Try to parse as JSON first
                        let viewCount = 0;
                        try {
                            const data = JSON.parse(text);
                            viewCount = parseInt(data.view_count || data.views || 0);
                        } catch (e) {
                            // If not JSON, try to parse as number
                            viewCount = parseInt(text) || 0;
                        }

                        console.log('[Dashboard] Final view count:', viewCount);
                        return viewCount;
                    } else {
                        const apiUrl = `https://video-api-801394283865.us-central1.run.app/views?url=${encodeURIComponent(url)}`;
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
                        const response = await fetch(proxyUrl);
                        const data = await response.json();
                        return parseInt(data.view_count || 0);
                    }
                } catch (err) {
                    console.error("Error fetching views for:", url, err);
                    return 0;
                }
            };

            const tasksWithLinks = tasks.filter(task => task.editor_links && (task.editor_links.youtube || task.editor_links.facebook || task.editor_links.tiktok));

            for (const task of tasksWithLinks) {
                const links = task.editor_links || {};
                const updatedViews = { youtube: [], facebook: [], tiktok: [] };

                // Process YouTube
                const ytLinks = Array.isArray(links.youtube) ? links.youtube : (links.youtube ? [links.youtube] : []);
                for (const link of ytLinks) {
                    updatedViews.youtube.push(await fetchViews(link));
                }

                // Process Facebook
                const fbLinks = Array.isArray(links.facebook) ? links.facebook : (links.facebook ? [links.facebook] : []);
                for (const link of fbLinks) {
                    updatedViews.facebook.push(await fetchViews(link));
                }

                // Process TikTok
                const ttLinks = Array.isArray(links.tiktok) ? links.tiktok : (links.tiktok ? [links.tiktok] : []);
                for (const link of ttLinks) {
                    updatedViews.tiktok.push(await fetchViews(link));
                }

                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, {
                    view_counts: updatedViews
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
        const exportData = filteredTasks.map(task => {
            const vc = task.view_counts || {};
            const yt = Array.isArray(vc.youtube) ? vc.youtube.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(vc.youtube) || 0);
            const fb = Array.isArray(vc.facebook) ? vc.facebook.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(vc.facebook) || 0);
            const tt = Array.isArray(vc.tiktok) ? vc.tiktok.reduce((a, b) => a + (parseInt(b) || 0), 0) : (parseInt(vc.tiktok) || 0);

            return {
                'Date Created': task.created_at?.toDate().toLocaleDateString() || 'N/A',
                'Due Date': task.due_date?.toDate().toLocaleDateString() || 'N/A',
                'Programme': task.program || 'N/A',
                'Brand': task.brand || 'N/A',
                'Platform': task.platform?.join(', ') || 'N/A',
                'YouTube Views': yt,
                'Facebook Views': fb,
                'TikTok Views': tt,
                'Total Views': yt + fb + tt,
                'Status': task.status || 'N/A',
                ...(userRole === 'Admin' ? { 'Editor': userNames[task.editor_id] || task.editor_id || 'Unassigned' } : {})
            };
        });

        // Create worksheet and workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks Report');

        // Generate filename with current date
        const filename = `Dashboard_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);
    };

    const handleClearFilters = () => {
        setFilters({
            status: 'all',
            brand: 'all',
            programme: 'all',
            dateRange: 'all',
            startDate: '',
            endDate: ''
        });
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const { userRole } = useAuth();

    if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
                <div>
                    <h1 className="text-4xl font-bold text-gradient mb-2">Dashboard</h1>
                    <p className="text-slate-500">Overview of your brand performance</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshViews}
                        disabled={refreshing}
                        className="btn-secondary flex items-center gap-2"
                        title="Update view counts for all tasks"
                    >
                        <RefreshCw className={clsx(refreshing && "animate-spin")} size={18} />
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
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                    >
                        <X size={14} />
                        Clear Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-600 font-medium appearance-none"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In_Review">In Review</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-600 font-medium appearance-none"
                            value={filters.brand}
                            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                        >
                            <option value="all">All Brands</option>
                            {/* Unique brands from tasks */}
                            {[...new Set(tasks.map(t => t.brand).filter(Boolean))].map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-600 font-medium appearance-none"
                            value={filters.programme}
                            onChange={(e) => setFilters({ ...filters, programme: e.target.value })}
                        >
                            <option value="all">All Programs</option>
                            {/* Unique programs from tasks */}
                            {[...new Set(tasks.map(t => t.program).filter(Boolean))].map(prog => (
                                <option key={prog} value={prog}>{prog}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-600 font-medium"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            placeholder="Start Date"
                        />
                    </div>

                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-600 font-medium"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            placeholder="End Date"
                        />
                    </div>
                </div>
            </div>
            {/* Programme Task Count Panels */}
            {stats.programmeData.length > 0 && (
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.05s' }}>
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Layers size={20} className="text-indigo-600" />
                        Tasks by Programme
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {stats.programmeData.map((prog, index) => (
                            <button
                                key={prog.name}
                                onClick={() => setFilters({ ...filters, programme: prog.name })}
                                className={clsx(
                                    "p-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 text-left",
                                    filters.programme === prog.name
                                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg"
                                        : "bg-white/50 backdrop-blur-sm border-2 border-slate-200 hover:border-indigo-300 text-slate-700"
                                )}
                                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                            >
                                <div className="font-bold text-sm mb-1 truncate" title={prog.name}>
                                    {prog.name}
                                </div>
                                <div className={clsx(
                                    "text-2xl font-bold",
                                    filters.programme === prog.name ? "text-white" : "text-indigo-600"
                                )}>
                                    {prog.tasks}
                                </div>
                                <div className={clsx(
                                    "text-xs font-medium",
                                    filters.programme === prog.name ? "text-indigo-100" : "text-slate-500"
                                )}>
                                    {prog.tasks === 1 ? 'task' : 'tasks'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Clock className="text-blue-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Pending</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.pending}</h3>
                    <p className="text-sm text-slate-500 mt-1">Tasks waiting for action</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <CheckCircle className="text-green-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Completed Today</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.completedToday}</h3>
                    <p className="text-sm text-slate-500 mt-1">Tasks finished today</p>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Eye className="text-purple-500" size={24} />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Total Views</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.totalViews.toLocaleString()}</h3>
                    <p className="text-sm text-slate-500 mt-1">Total views across all platforms</p>
                </div>
            </div>

            {/* Platform Performance Charts */}
            {brandStats.length > 0 && (
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.35s' }}>
                    <h3 className="text-xl font-bold text-gradient mb-6 flex items-center gap-2">
                        <BarChart3 size={24} />
                        Platform Performance by Brand
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* YouTube Chart */}
                        <div className="h-64">
                            <h4 className="text-sm font-bold text-center mb-2 text-red-600">YouTube Views</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={brandStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }}
                                    />
                                    <Bar dataKey="youtube" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} name="Views" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Facebook Chart */}
                        <div className="h-64">
                            <h4 className="text-sm font-bold text-center mb-2 text-blue-600">Facebook Views</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={brandStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                    />
                                    <Bar dataKey="facebook" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} name="Views" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* TikTok Chart */}
                        <div className="h-64">
                            <h4 className="text-sm font-bold text-center mb-2 text-slate-800">TikTok Views</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={brandStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'rgba(15, 23, 42, 0.1)' }}
                                    />
                                    <Bar dataKey="tiktok" fill="#0F172A" radius={[0, 4, 4, 0]} barSize={20} name="Views" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* User Performance Analysis (Admin Only) */}
            {userRole === 'Admin' && (
                <div className="card-glass p-8 rounded-2xl shadow-premium animate-slideUp mb-8" style={{ animationDelay: '0.4s' }}>
                    <h3 className="text-2xl font-bold text-gradient mb-6 flex items-center gap-2">
                        <Users size={24} className="text-indigo-600" />
                        User Performance Analysis
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4 text-center">Assigned</th>
                                    <th className="px-6 py-4 text-center">Pending</th>
                                    <th className="px-6 py-4 text-center">In Review</th>
                                    <th className="px-6 py-4 text-center">Completed</th>
                                    <th className="px-6 py-4 text-right">Total Views</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userStats.map(stat => (
                                    <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {userNames[stat.id] || stat.id}
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600">{stat.assigned}</td>
                                        <td className="px-6 py-4 text-center text-yellow-600">{stat.pending}</td>
                                        <td className="px-6 py-4 text-center text-purple-600">{stat.inReview}</td>
                                        <td className="px-6 py-4 text-center text-green-600">{stat.completed}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                                            {stat.totalViews.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tasks by Status - Pie Chart */}
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.5s' }}>
                    <h3 className="font-bold text-xl text-gradient mb-4">Tasks by Status</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {stats.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Views by Platform */}
                {stats.platformData.length > 0 && (
                    <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.6s' }}>
                        <h3 className="font-bold text-xl text-gradient mb-4">Total Views by Platform</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.platformData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#64748b', fontWeight: 600 }}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#64748b' }}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Bar
                                        dataKey="views"
                                        radius={[8, 8, 0, 0]}
                                        label={{ position: 'top', fill: '#475569', fontWeight: 'bold' }}
                                    >
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
                )}
            </div>

            {/* Tasks by Brand - Full Width */}
            <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.7s' }}>
                <h3 className="font-bold text-xl text-gradient mb-4">Tasks by Brand</h3>
                <div className="h-96">
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
                            <YAxis
                                tick={{ fill: '#64748b' }}
                                axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                            />
                            <Bar
                                dataKey="tasks"
                                radius={[8, 8, 0, 0]}
                                label={{ position: 'top', fill: '#475569', fontWeight: 'bold' }}
                            >
                                {stats.brandData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`hsl(${(index * 360) / stats.brandData.length}, 70%, 60%)`}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="card-glass rounded-2xl shadow-premium overflow-hidden animate-slideUp" style={{ animationDelay: '0.8s' }}>
                <div className="p-6 border-b border-white/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="font-bold text-xl text-gradient">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Program</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">FB Views</th>
                                <th className="px-6 py-4 text-right">YT Views</th>
                                <th className="px-6 py-4 text-right">TikTok Views</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-600">
                                        {task.created_at?.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.brand}</td>
                                    <td className="px-6 py-4 text-slate-600">{task.program}</td>
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
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        pending
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        pending
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        pending
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
