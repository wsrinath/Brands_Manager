import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Search, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export default function Compare() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedProgram, setSelectedProgram] = useState('');
    const [programSearch, setProgramSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const dates = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - 3 + i);
            return d;
        });
    }, []);

    const availableProgrammes = React.useMemo(() => {
        return [...new Set(tasks.map(t => t.program).filter(Boolean))].sort();
    }, [tasks]);

    const filteredProgrammes = React.useMemo(() => {
        return availableProgrammes.filter(p => p.toLowerCase().includes(programSearch.toLowerCase()));
    }, [availableProgrammes, programSearch]);

    const tableData = React.useMemo(() => {
        if (!selectedProgram) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use ALL tasks (including Completed) so that brands with only past/completed
        // tasks still appear as rows in the grid.
        const programTasks = tasks.filter(t => t.program === selectedProgram);
        const uniqueBrands = [...new Set(programTasks.map(t => t.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));

        return uniqueBrands.map(brand => {
            const brandTasks = programTasks.filter(t => t.brand === brand);
            const scheduledDates = dates.map(date => {
                // For past dates → include completed tasks so historical slots stay green.
                // For today & future → only show non-completed tasks.
                const isPast = date < today;
                const relevantTasks = isPast
                    ? brandTasks
                    : brandTasks.filter(t => t.status !== 'Completed');

                return relevantTasks.some(t => {
                    if (!t.due_date) return false;
                    const taskDate = t.due_date.toDate();
                    return taskDate.getFullYear() === date.getFullYear() &&
                        taskDate.getMonth() === date.getMonth() &&
                        taskDate.getDate() === date.getDate();
                });
            });
            return { brand, scheduledDates };
        });
    }, [tasks, selectedProgram, dates]);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading schedules...</div>;

    return (
        <div className="animate-fadeIn pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
                    <BarChart2 size={32} className="text-indigo-600" />
                    Compare Schedules
                </h1>
                <p className="text-slate-600 font-medium mt-1">View and compare brand schedules for the current week.</p>
            </div>

            <div className="card-glass p-6 rounded-2xl shadow-premium relative z-10 min-h-[500px]">
                <div className="mb-8 max-w-sm relative z-20">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Programme</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                            placeholder="Type to search programme..."
                            value={programSearch}
                            onChange={(e) => {
                                setProgramSearch(e.target.value);
                                setShowDropdown(true);
                                if (e.target.value === '') {
                                    setSelectedProgram('');
                                }
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {showDropdown && programSearch && filteredProgrammes.length > 0 && (
                            <ul className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredProgrammes.map(prog => (
                                    <li
                                        key={prog}
                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-100 last:border-0"
                                        onClick={() => {
                                            setSelectedProgram(prog);
                                            setProgramSearch(prog);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {prog}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {showDropdown && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                        )}
                    </div>
                </div>

                {selectedProgram ? (
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-slate-200 rounded-xl custom-scrollbar relative z-0">
                        <table className="w-full text-sm text-center border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r border-slate-200 text-left w-64 min-w-[200px] sticky left-0 bg-slate-50 z-20">
                                        <div className="font-bold text-slate-700">Brand</div>
                                        <div className="text-[10px] text-slate-400 font-normal">{selectedProgram}</div>
                                    </th>
                                    {dates.map((date, idx) => {
                                        const isToday = idx === 3;
                                        const isYesterday = idx === 2;
                                        const isTomorrow = idx === 4;

                                        let label = date.toLocaleDateString('en-GB', { weekday: 'long' });
                                        if (isToday) label = 'Today';
                                        else if (isYesterday) label = 'Yesterday';
                                        else if (isTomorrow) label = 'Tomorrow';

                                        return (
                                            <th key={idx} className={clsx(
                                                "px-2 py-3 border-b border-slate-200 min-w-[120px]",
                                                idx !== 6 ? "border-r" : "",
                                                isToday ? "bg-indigo-50 border-b-indigo-200" : ""
                                            )}>
                                                <div className={clsx(
                                                    "font-bold",
                                                    isToday ? "text-indigo-700 text-base" : "text-slate-600 text-sm"
                                                )}>
                                                    {label}
                                                </div>
                                                <div className={clsx(
                                                    "text-[10px]",
                                                    isToday ? "text-indigo-500 font-bold" : "text-slate-400 font-normal"
                                                )}>
                                                    {date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-500 bg-white">
                                            No active tasks found for brands in this programme.
                                        </td>
                                    </tr>
                                ) : (
                                    tableData.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors bg-white group">
                                            <td className="px-4 py-3 border-b border-r border-slate-200 text-left font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50/50 shadow-[1px_0_0_0_#e2e8f0] max-w-[200px] truncate z-0">
                                                {row.brand}
                                            </td>
                                            {row.scheduledDates.map((isScheduled, cIdx) => (
                                                <td key={cIdx} className={clsx(
                                                    "px-2 py-3 border-b border-slate-200 transition-colors",
                                                    cIdx !== 6 ? "border-r" : "",
                                                    isScheduled ? "bg-green-500 border-green-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]" : "bg-white",
                                                    cIdx === 3 && !isScheduled ? "bg-indigo-50/30" : ""
                                                )}>
                                                    {isScheduled && <div className="mx-auto w-4 h-4 rounded-full bg-white/30 backdrop-blur shadow-sm"></div>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <BarChart2 size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">No Programme Selected</h3>
                        <p className="text-slate-500 text-sm max-w-md text-center mt-2">Search and select a programme from the dropdown above to view the 7-day brand scheduling grid.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
