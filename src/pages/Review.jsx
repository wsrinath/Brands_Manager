import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { Calendar, Filter, User, Layers, Search, X, CheckSquare } from 'lucide-react';
import clsx from 'clsx';

export default function Review() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [filters, setFilters] = useState({
        client: 'all',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        // Fetch Client List for Filter
        const fetchClients = async () => {
            try {
                const docRef = doc(db, 'metadata', 'lists');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setClients(docSnap.data().clients || []);
                }
            } catch (err) {
                console.error("Error fetching clients:", err);
            }
        };
        fetchClients();

        // Fetch Schedule Logs
        const q = query(collection(db, 'schedule_logs'), orderBy('created_at', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(logsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesClient = filters.client === 'all' || log.client === filters.client;

        // Date Range Filtering (Based on Creation Date)
        let matchesDate = true;
        if (filters.startDate) {
            const logDate = log.created_at?.toDate();
            const start = new Date(filters.startDate);
            matchesDate = matchesDate && logDate >= start;
        }
        if (filters.endDate) {
            const logDate = log.created_at?.toDate();
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && logDate <= end;
        }

        return matchesClient && matchesDate;
    });

    const handleClearFilters = () => {
        setFilters({ client: 'all', startDate: '', endDate: '' });
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (logs.length === 0) return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-8">
            <h1 className="text-3xl font-bold text-gradient mb-8">Schedule Review</h1>
            <div className="text-center py-12 card-glass rounded-2xl">
                <Layers size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-600">No scheduled batches found</h3>
                <p className="text-slate-500 mt-2">New schedules created from now on will appear here.</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gradient">Schedule Review</h1>
                <p className="text-slate-600 font-medium mt-1">Audit and review scheduled tasks and batches</p>
            </div>

            {/* Filters */}
            <div className="card-glass p-6 rounded-2xl shadow-premium mb-8 animate-slideUp">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <Filter size={20} className="text-indigo-600" />
                        Filters
                    </h3>
                    <button onClick={handleClearFilters} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                        <X size={16} /> Clear All
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Client</label>
                        <select
                            value={filters.client}
                            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Clients</option>
                            {clients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">From</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">To</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-6">
                {filteredLogs.map((log) => (
                    <div key={log.id} className="card-glass rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 border-l-4 border-l-indigo-500 animate-slideUp">
                        {/* Header Info */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md uppercase">
                                        {log.type === 'bulk' ? 'Bulk Schedule' : 'Single Task'}
                                    </span>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <Calendar size={14} />
                                        <span>{log.created_at?.toDate().toLocaleDateString()}</span>
                                        <span className="text-slate-300">|</span>
                                        <div className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                                            {log.created_at?.toDate().toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {log.client || 'No Client'} <span className="text-slate-400 mx-2">|</span> {log.brand} - {log.program}
                                </h3>
                                <p className="text-sm text-slate-500">Scheduled by: <span className="font-medium text-slate-700">{log.scheduler_name}</span></p>
                            </div>

                            {/* Summary Stats */}
                            <div className="flex gap-4 text-sm">
                                <div className="text-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                    <div className="font-bold text-slate-700">{log.task_count}</div>
                                    <div className="text-xs text-slate-500">Copies/Date</div>
                                </div>
                                <div className="text-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                    <div className="font-bold text-slate-700">{log.ad_count}</div>
                                    <div className="text-xs text-slate-500">Ads</div>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div className="space-y-3">
                                <div>
                                    <span className="font-bold text-slate-600 block mb-1">Description</span>
                                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg">{log.description}</p>
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <span className="font-bold text-slate-600 block mb-1">Assigned To</span>
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-slate-400" />
                                            {log.assigned_to || 'Unassigned'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-600 block mb-1">Team</span>
                                        <div className="flex items-center gap-2">
                                            <Layers size={14} className="text-slate-400" />
                                            {log.assigned_team || 'No Team'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {log.type === 'single' ? (
                                    <>
                                        <div>
                                            <span className="font-bold text-slate-600 block mb-1">Due Date</span>
                                            <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                                <Calendar size={16} />
                                                {log.due_date?.toDate().toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-600 block mb-1">Platforms</span>
                                            <div className="flex gap-2">
                                                {log.platforms?.map(p => (
                                                    <span key={p} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs capitalize">{p}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Bulk Details */}
                                        {log.bulk_type === 'range' && (
                                            <div>
                                                <span className="font-bold text-slate-600 block mb-1">Date Range ({log.frequency})</span>
                                                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                                    <Calendar size={16} />
                                                    {log.start_date?.toDate().toLocaleDateString()} - {log.end_date?.toDate().toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}
                                        {log.bulk_type === 'specific' && (
                                            <div>
                                                <span className="font-bold text-slate-600 block mb-1">Specific Dates ({log.specific_dates?.length})</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {log.specific_dates?.map((d, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">
                                                            {d?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2">
                                            <span className="font-bold text-slate-600 block mb-1">Platforms</span>
                                            {log.platforms ? (
                                                <div className="flex gap-2">
                                                    {log.platforms.map(p => (
                                                        <span key={p} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs capitalize">{p}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">Varied per date</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
