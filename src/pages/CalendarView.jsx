import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../calendar.css';
import { Filter, CheckCircle, Clock, Calendar, BarChart } from 'lucide-react';
import clsx from 'clsx';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
    const [tasks, setTasks] = useState([]);
    const [view, setView] = useState('month');
    const [filter, setFilter] = useState('all'); // all, complete, incomplete
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDateTasks, setSelectedDateTasks] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        let filteredTasks = [...tasks];

        // Apply filter
        if (filter === 'complete') {
            filteredTasks = filteredTasks.filter(t => t.status === 'Completed');
        } else if (filter === 'incomplete') {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Completed');
        }

        // Convert tasks to calendar events
        const calendarEvents = filteredTasks.map(task => {
            // Parse due date properly
            let dueDate;
            if (task.due_date) {
                // Handle Firestore Timestamp or string
                if (task.due_date.toDate) {
                    dueDate = task.due_date.toDate();
                } else {
                    dueDate = new Date(task.due_date);
                }
            } else {
                dueDate = new Date();
            }

            // Determine color based on status
            let color;
            if (task.status === 'Completed') {
                color = '#10b981'; // Emerald-500
            } else if (task.status === 'In_Review') {
                color = '#8b5cf6'; // Violet-500
            } else if (task.status === 'Assigned') {
                color = '#3b82f6'; // Blue-500
            } else {
                color = '#f59e0b'; // Amber-500
            }

            return {
                id: task.id,
                title: `${task.brand} - ${task.program}`,
                start: dueDate,
                end: dueDate,
                allDay: true,
                resource: {
                    status: task.status,
                    brand: task.brand,
                    program: task.program,
                    color: color
                }
            };
        });

        setEvents(calendarEvents);
    }, [tasks, filter]);

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.resource?.color || '#64748b',
                borderRadius: '8px',
                opacity: 1,
                color: 'white',
                border: 'none',
                display: 'block',
                fontWeight: '600',
                fontSize: '0.813rem',
                padding: '4px 8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'transform 0.2s',
            }
        };
    };

    const EventComponent = ({ event }) => (
        <div className="hover:scale-[1.02] transition-transform">
            <div className="font-bold text-[0.8rem] truncate">
                {event.title}
            </div>
            <div className="text-[0.65rem] opacity-90 mt-0.5 font-medium">
                {event.resource?.status?.replace('_', ' ')}
            </div>
        </div>
    );

    const handleSelectSlot = (slotInfo) => {
        const clickedDate = slotInfo.start;
        setSelectedDate(clickedDate);

        // Filter tasks for the selected date
        const tasksOnDate = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === clickedDate.toDateString();
        });

        setSelectedDateTasks(tasksOnDate);
    };

    const handleSelectEvent = (event) => {
        // When clicking an event, show that date's summary
        setSelectedDate(event.start);
        const tasksOnDate = events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === event.start.toDateString();
        });
        setSelectedDateTasks(tasksOnDate);
    };

    // Calculate summary statistics for selected date
    const getDateSummary = () => {
        if (selectedDateTasks.length === 0) return null;

        const brands = {};
        let completed = 0;
        let incomplete = 0;

        selectedDateTasks.forEach(task => {
            // Count by brand
            brands[task.resource.brand] = (brands[task.resource.brand] || 0) + 1;

            // Count by status
            if (task.resource.status === 'Completed') {
                completed++;
            } else {
                incomplete++;
            }
        });

        return {
            total: selectedDateTasks.length,
            brands,
            completed,
            incomplete
        };
    };

    const summary = getDateSummary();

    return (
        <div className="animate-fadeIn pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gradient">Calendar View</h1>
                <p className="text-slate-600 font-medium mt-1">Visual timeline of tasks with color-coded completion status</p>
            </div>

            {/* Filters and Legend */}
            <div className="card-glass p-6 rounded-2xl shadow-premium mb-8 animate-slideUp">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-800 font-bold bg-white/50 px-3 py-1.5 rounded-lg">
                            <Filter size={18} className="text-indigo-600" />
                            <span>Filter:</span>
                        </div>

                        <div className="flex bg-slate-100/80 p-1 rounded-xl backdrop-blur-sm">
                            <button
                                onClick={() => setFilter('all')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                    filter === 'all'
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                All Tasks
                            </button>
                            <button
                                onClick={() => setFilter('complete')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    filter === 'complete'
                                        ? "bg-white text-green-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <CheckCircle size={16} />
                                Complete
                            </button>
                            <button
                                onClick={() => setFilter('incomplete')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    filter === 'incomplete'
                                        ? "bg-white text-amber-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Clock size={16} />
                                Incomplete
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm font-medium bg-white/50 px-4 py-2 rounded-xl border border-white/50">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-slate-700">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-slate-700">Assigned</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                            <span className="text-slate-700">In Review</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                            <span className="text-slate-700">Pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="card-glass p-6 rounded-2xl shadow-premium h-[750px]">
                        <BigCalendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                event: EventComponent
                            }}
                            views={['month', 'week', 'day', 'agenda']}
                            view={view}
                            onView={setView}
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            className="premium-calendar"
                        />
                    </div>
                </div>

                {/* Summary Panel */}
                <div className="lg:col-span-1 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="card-glass p-0 rounded-2xl shadow-premium sticky top-6 overflow-hidden">
                        <div className="p-6 border-b border-white/30 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="text-indigo-500" size={20} />
                                {selectedDate ? moment(selectedDate).format('MMMM D, YYYY') : 'Select a Date'}
                            </h3>
                        </div>

                        <div className="p-6">
                            {selectedDate ? (
                                <>
                                    {summary && summary.total > 0 ? (
                                        <div className="space-y-6">
                                            {/* Total Count */}
                                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200/60 shadow-inner">
                                                <div className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Tasks</div>
                                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">{summary.total}</div>
                                            </div>

                                            {/* Status Breakdown */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-green-50/80 p-4 rounded-xl border border-green-100 shadow-sm">
                                                    <div className="text-xs font-bold text-green-700 mb-1 uppercase">Completed</div>
                                                    <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
                                                </div>
                                                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 shadow-sm">
                                                    <div className="text-xs font-bold text-amber-700 mb-1 uppercase">Incomplete</div>
                                                    <div className="text-2xl font-bold text-amber-600">{summary.incomplete}</div>
                                                </div>
                                            </div>

                                            {/* Brands */}
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                    <BarChart size={16} className="text-indigo-500" />
                                                    Brand Distribution
                                                </h4>
                                                <div className="space-y-2.5">
                                                    {Object.entries(summary.brands).map(([brand, count]) => (
                                                        <div key={brand} className="flex items-center justify-between bg-white/60 p-3 rounded-lg border border-white/60 shadow-sm">
                                                            <span className="text-sm font-medium text-slate-700">{brand}</span>
                                                            <span className="text-sm font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Task List */}
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-3">Tasks</h4>
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {selectedDateTasks.map(task => (
                                                        <div
                                                            key={task.id}
                                                            className="p-3 rounded-xl border-l-[6px] bg-white shadow-sm hover:shadow-md transition-all"
                                                            style={{
                                                                borderLeftColor: task.resource.color,
                                                            }}
                                                        >
                                                            <div className="text-sm font-bold text-slate-800 line-clamp-1">
                                                                {task.resource.program}
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                    {task.resource.brand}
                                                                </span>
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                                    {task.resource.status.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-slate-400">
                                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Calendar size={32} className="opacity-50" />
                                            </div>
                                            <p className="font-medium">No tasks on this date</p>
                                            <p className="text-sm mt-1 opacity-70">Enjoy your free time!</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                                        <Calendar size={40} className="text-indigo-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-600 mb-2">No Date Selected</h4>
                                    <p className="text-sm max-w-[200px] mx-auto leading-relaxed opacity-80">Click on any date or event in the calendar to view detailed analytics and tasks.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
