import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { History, Filter, X, Download, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

export default function TaskHistory() {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser, userRole } = useAuth();
    const [userNames, setUserNames] = useState({});
    const [allEditors, setAllEditors] = useState([]);
    const [filters, setFilters] = useState({
        programme: 'all',
        editor: 'all',
        brand: 'all',
        client: 'all',
        status: 'all',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        let q;

        // Fetch tasks based on role
        if (userRole === 'Editor') {
            // Editors see only their completed tasks
            q = query(
                collection(db, 'tasks'),
                where('status', '==', 'Completed'),
                where('editor_id', '==', currentUser.uid)
            );
        } else if (userRole === 'Scheduler') {
            // Schedulers see only tasks they scheduled
            q = query(
                collection(db, 'tasks'),
                where('assignedBy', '==', currentUser.uid)
            );
        } else {
            // Admins see all tasks
            q = query(collection(db, 'tasks'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
            fetchUserNames(tasksData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser.uid, userRole]);

    // Fetch all editors for dropdown
    useEffect(() => {
        const q = query(collection(db, 'users'), where('role', 'in', ['Editor', 'editor']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const editors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllEditors(editors);
        });
        return () => unsubscribe();
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

    // Apply filters
    useEffect(() => {
        let filtered = [...tasks];

        // Filter by programme
        if (filters.programme !== 'all') {
            filtered = filtered.filter(task => task.program === filters.programme);
        }

        // Filter by editor
        if (filters.editor !== 'all') {
            filtered = filtered.filter(task => task.editor_id === filters.editor);
        }

        // Filter by brand
        if (filters.brand !== 'all') {
            filtered = filtered.filter(task => task.brand === filters.brand);
        }

        // Filter by client
        if (filters.client !== 'all') {
            filtered = filtered.filter(task => task.client === filters.client);
        }

        // Filter by status
        if (filters.status !== 'all') {
            filtered = filtered.filter(task => task.status === filters.status);
        }

        // Filter by start date
        if (filters.startDate) {
            filtered = filtered.filter(task => {
                if (!task.due_date) return false;
                const taskDate = task.due_date.toDate();
                const startDate = new Date(filters.startDate);
                return taskDate >= startDate;
            });
        }

        // Filter by end date
        if (filters.endDate) {
            filtered = filtered.filter(task => {
                if (!task.due_date) return false;
                const taskDate = task.due_date.toDate();
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                return taskDate <= endDate;
            });
        }

        // Sort by Due Date (Future -> Past)
        filtered.sort((a, b) => {
            const dateA = a.due_date ? a.due_date.toDate() : new Date(0);
            const dateB = b.due_date ? b.due_date.toDate() : new Date(0);
            return dateB - dateA; // Descending
        });

        setFilteredTasks(filtered);
    }, [tasks, filters]);

    const handleClearFilters = () => {
        setFilters({
            programme: 'all',
            editor: 'all',
            brand: 'all',
            client: 'all',
            status: 'all',
            startDate: '',
            endDate: ''
        });
    };

    const handleBulkDelete = async () => {
        if (userRole?.toLowerCase() !== 'admin') {
            alert("Only admins can perform bulk delete actions.");
            return;
        }

        if (filteredTasks.length === 0) {
            alert("No tasks available to delete matching current filters.");
            return;
        }

        const confirmMessage = `WARNING: You are about to DELETE ${filteredTasks.length} tasks matching your current filters.\n\nThis action CANNOT be undone.\n\nAre you sure you want to continue?`;

        if (window.confirm(confirmMessage)) {
            if (!window.confirm(`FINAL CONFIRMATION: Delete ${filteredTasks.length} tasks PERMANENTLY?`)) {
                return;
            }

            setLoading(true);
            try {
                const deletePromises = filteredTasks.map(task => deleteDoc(doc(db, 'tasks', task.id)));
                await Promise.all(deletePromises);
                alert(`Successfully deleted ${filteredTasks.length} tasks.`);
            } catch (error) {
                console.error("Error performing bulk delete:", error);
                alert("Failed to delete some tasks: " + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleExportToExcel = () => {
        const exportData = filteredTasks.flatMap(task => {
            const rows = [];

            ['youtube', 'facebook', 'tiktok'].forEach(p => {
                const links = task.editor_links?.[p] || [];
                const linksArray = Array.isArray(links) ? links : [links];
                const viewsArray = Array.isArray(task.view_counts?.[p]) ? task.view_counts[p] : [task.view_counts?.[p] || 0];

                linksArray.forEach((link, i) => {
                    if (!link) return;
                    rows.push({
                        'Date Created': task.created_at?.toDate().toLocaleDateString() || 'N/A',
                        'Due Date': task.due_date?.toDate().toLocaleDateString() || 'N/A',
                        'Client': task.client || 'N/A',
                        'Programme': task.program || 'N/A',
                        'Editor': userNames[task.editor_id] || 'Unassigned',
                        'Brand': task.brand || 'N/A',
                        'Status': task.status || 'N/A',
                        'Platform': p.charAt(0).toUpperCase() + p.slice(1),
                        'Particular URL of the social media': link,
                        'View count for the relevant URL': viewsArray[i] || 0
                    });
                });
            });

            // If no links at all, still add one row for the task
            if (rows.length === 0) {
                rows.push({
                    'Date Created': task.created_at?.toDate().toLocaleDateString() || 'N/A',
                    'Due Date': task.due_date?.toDate().toLocaleDateString() || 'N/A',
                    'Client': task.client || 'N/A',
                    'Programme': task.program || 'N/A',
                    'Editor': userNames[task.editor_id] || 'Unassigned',
                    'Brand': task.brand || 'N/A',
                    'Status': task.status || 'N/A',
                    'Platform': task.platform?.join(', ') || 'N/A',
                    'Particular URL of the social media': 'No links submitted',
                    'View count for the relevant URL': 0
                });
            }

            return rows;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Task History');

        const filename = `Task_History_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading task history...</div>;

    return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-8">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gradient mb-2">Task History</h1>
                    <p className="text-slate-500">{userRole === 'Editor' ? 'View your completed tasks' : 'View all scheduled tasks'}</p>
                </div>
                <button
                    onClick={handleExportToExcel}
                    className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all transform hover:scale-105 active:scale-95"
                >
                    <Download size={18} />
                    Export to Excel
                </button>
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
                <div className={clsx(
                    "grid grid-cols-1 gap-4",
                    userRole?.toLowerCase() === 'admin' ? "md:grid-cols-4 lg:grid-cols-7" : "md:grid-cols-4 lg:grid-cols-6"
                )}>
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

                    {/* Editor Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Editor</label>
                        <select
                            value={filters.editor}
                            onChange={(e) => setFilters({ ...filters, editor: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Editors</option>
                            {allEditors.map(editor => (
                                <option key={editor.id} value={editor.id}>{editor.name || editor.displayName || editor.email}</option>
                            ))}
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

                    {/* Client Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Client</label>
                        <select
                            value={filters.client}
                            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Clients</option>
                            {[...new Set(tasks.map(t => t.client).filter(Boolean))].map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter (Admin & Editor only) */}
                    {(userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'editor') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In_Review">In Review</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    )}

                    {/* Start Date Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* End Date Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Delete Function (Admin Only) */}
                    {userRole?.toLowerCase() === 'admin' && (
                        <div>
                            <label className="block text-sm font-bold text-red-600 mb-2">Delete Items</label>
                            <button
                                onClick={handleBulkDelete}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm animate-pulse-slow"
                                title="Delete all items matching current filters"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="card-glass rounded-2xl shadow-premium overflow-hidden animate-slideUp">
                <div className="p-6 border-b border-white/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="font-bold text-xl text-gradient">{userRole === 'Editor' ? 'My Completed Tasks' : 'All Tasks'}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Date Created</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Programme</th>
                                <th className="px-6 py-4 text-indigo-600">Editor</th>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4 w-96">Particular URL of the social media</th>
                                <th className="px-6 py-4 text-right">View count for the relevant URL</th>
                                {(userRole === 'Scheduler' || userRole === 'Admin') && <th className="px-6 py-4">Editor</th>}
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
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.client || '-'}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.program}</td>
                                    <td className="px-6 py-4 font-bold text-indigo-600">
                                        {userNames[task.editor_id] || <span className="text-slate-300 italic text-xs">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{task.brand}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            task.status === 'Completed' ? "bg-green-100 text-green-700" :
                                                task.status === 'In_Review' ? "bg-purple-100 text-purple-700" :
                                                    task.status === 'Assigned' ? "bg-blue-100 text-blue-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                        )}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {task.platform?.map(p => (
                                                <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Particular URLs */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-3">
                                            {['youtube', 'facebook', 'tiktok'].map(p => {
                                                const links = task.editor_links?.[p];
                                                const linksArray = Array.isArray(links) ? links : (links ? [links] : []);
                                                if (linksArray.length === 0) return null;

                                                return (
                                                    <div key={p} className="text-xs space-y-1">
                                                        <span className={clsx(
                                                            "font-bold uppercase tracking-wider text-[10px]",
                                                            p === 'youtube' ? "text-red-600" : p === 'facebook' ? "text-blue-600" : "text-slate-900"
                                                        )}>{p}:</span>
                                                        <div className="pl-2 border-l-2 border-slate-100 space-y-1">
                                                            {linksArray.map((link, i) => (
                                                                <a key={i} href={link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate block w-64" title={link}>
                                                                    {i + 1}. {link}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {!task.editor_links && <span className="text-slate-400 text-xs italic">No links submitted</span>}
                                        </div>
                                    </td>

                                    {/* View Counts */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col gap-3">
                                            {['youtube', 'facebook', 'tiktok'].map(p => {
                                                const views = task.view_counts?.[p];
                                                const viewsArray = Array.isArray(views) ? views : (views ? [views] : []);
                                                const links = task.editor_links?.[p];
                                                const linksArray = Array.isArray(links) ? links : (links ? [links] : []);
                                                if (linksArray.length === 0) return null;

                                                return (
                                                    <div key={p} className="text-xs space-y-1">
                                                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 opacity-0">{p}:</span>
                                                        <div className="space-y-1">
                                                            {linksArray.map((_, i) => (
                                                                <div key={i} className="font-mono text-slate-700 bg-slate-50 px-2 rounded">
                                                                    {Number(viewsArray[i] || 0).toLocaleString()}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {!task.view_counts && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>

                                    {(userRole === 'Scheduler' || userRole === 'Admin') && (
                                        <td className="px-6 py-4 text-slate-600">
                                            {userNames[task.editor_id] || 'Unassigned'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={userRole === 'Scheduler' ? 9 : 8} className="px-6 py-12 text-center text-slate-400">
                                        No tasks found
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
