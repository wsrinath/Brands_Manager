import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp, query, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, AlertCircle, CheckSquare, Copy, Trash2, Users, X } from 'lucide-react';
import clsx from 'clsx';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SearchableSelect from '../components/SearchableSelect';

export default function Scheduler() {
    const { currentUser, userRole } = useAuth();
    const [brands, setBrands] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [tempSelectedDates, setTempSelectedDates] = useState([]);
    const [dateConfigurations, setDateConfigurations] = useState({});

    const [formData, setFormData] = useState({
        client: '',
        brand: '',
        program: '',
        description: '',
        dueDate: '',
        endDate: '',
        adCount: 1,
        taskCount: 1,
        assignTo: '',
        assignedTeam: '',
        platforms: {
            facebook: false,
            youtube: false,
            tiktok: false
        },
        recurring: false,
        frequency: 'daily'
    });

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const docRef = doc(db, 'metadata', 'lists');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBrands(data.brands || []);
                    setPrograms(data.programs || []);
                    setClients(data.clients || []);
                }
            } catch (err) {
                console.error("Error fetching metadata:", err);
                setError("Failed to load form data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'users'), where('role', '==', 'editor'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
        });

        return unsubscribe;
    }, []);

    const handlePlatformChange = (platform) => {
        setFormData(prev => ({
            ...prev,
            platforms: {
                ...prev.platforms,
                [platform]: !prev.platforms[platform]
            }
        }));
    };


    const handleSubmit = async (e) => {
        console.log('TASK CREATION ATTEMPT:', {
            uid: currentUser?.uid,
            role: userRole,
            email: currentUser?.email
        });
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Save new client if not exists
            if (formData.client && !clients.includes(formData.client)) {
                await updateDoc(doc(db, 'metadata', 'lists'), {
                    clients: arrayUnion(formData.client)
                });
                setClients(prev => [...prev, formData.client]);
            }

            let tasksCreated = 0;
            const selectedPlatforms = Object.keys(formData.platforms).filter(p => formData.platforms[p]);

            // Validation: Global platforms required UNLESS in "Select Specific Dates" mode
            const isSpecificDateMode = bulkMode && selectedDates.length > 0 && !formData.dueDate;

            if (!isSpecificDateMode && selectedPlatforms.length === 0) {
                throw new Error("Please select at least one platform");
            }

            // For Specific Date Mode, ensure at least one date has a valid configuration
            if (isSpecificDateMode) {
                const hasValidConfig = selectedDates.some(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    return dateConfigurations[dateStr]?.platforms?.length > 0;
                });

                if (!hasValidConfig) {
                    throw new Error("Please select platforms for at least one selected date");
                }
            }

            // Prepare Log Data (Common Fields)
            const logData = {
                created_at: serverTimestamp(),
                scheduler_id: currentUser.uid,
                scheduler_name: currentUser.email,
                client: formData.client,
                brand: formData.brand,
                program: formData.program,
                description: formData.description,
                assigned_to: formData.assignTo || null,
                assigned_team: formData.assignedTeam || null,
                task_count: parseInt(formData.taskCount)
            };

            if (!bulkMode) {
                // Single Task Creation
                Object.assign(logData, {
                    type: 'single',
                    due_date: Timestamp.fromDate(new Date(formData.dueDate)),
                    platforms: selectedPlatforms,
                    ad_count: parseInt(formData.adCount)
                });

                const taskData = {
                    created_at: serverTimestamp(),
                    status: formData.assignTo ? 'Assigned' : 'Pending',
                    client: formData.client,
                    brand: formData.brand,
                    program: formData.program,
                    description: formData.description,
                    platform: selectedPlatforms,
                    due_date: Timestamp.fromDate(new Date(formData.dueDate)),
                    ad_count: 1,
                    task_count: parseInt(formData.taskCount),
                    // Flutter Compatibility Fields
                    title: `${formData.brand} - ${formData.program}`,
                    date: Timestamp.fromDate(new Date(formData.dueDate)),
                    priority: 'Medium',
                    assignedBy: currentUser?.uid || 'System'
                };

                if (formData.assignTo) {
                    taskData.editor_id = formData.assignTo;
                    taskData.assignedTo = formData.assignTo;
                }
                if (formData.assignedTeam) {
                    taskData.assigned_team = formData.assignedTeam;
                }

                // Create SINGLE document with task_count
                await addDoc(collection(db, 'tasks'), taskData);
                tasksCreated++;
            } else {
                // Bulk Creation Logic
                let allDates = [];
                let bulkType = '';

                // 1. Add dates from Range if provided
                if (formData.dueDate && formData.endDate) {
                    bulkType = 'range';
                    let currentDate = new Date(formData.dueDate);
                    const end = new Date(formData.endDate);

                    while (currentDate <= end) {
                        allDates.push(new Date(currentDate));

                        // Increment based on frequency
                        if (formData.frequency === 'daily') {
                            currentDate.setDate(currentDate.getDate() + 1);
                        } else if (formData.frequency === 'weekly') {
                            currentDate.setDate(currentDate.getDate() + 7);
                        } else if (formData.frequency === 'monthly') {
                            currentDate.setMonth(currentDate.getMonth() + 1);
                        }
                    }

                    Object.assign(logData, {
                        type: 'bulk',
                        bulk_type: 'range',
                        start_date: Timestamp.fromDate(new Date(formData.dueDate)),
                        end_date: Timestamp.fromDate(new Date(formData.endDate)),
                        frequency: formData.frequency,
                        platforms: selectedPlatforms,
                        ad_count: parseInt(formData.adCount)
                    });
                }

                // 2. Add manually selected dates
                if (selectedDates.length > 0) {
                    // If mixed with range, it's complex, but assuming one or other based on UI logic
                    if (!formData.dueDate) {
                        bulkType = 'specific';
                        allDates = [...selectedDates];

                        Object.assign(logData, {
                            type: 'bulk',
                            bulk_type: 'specific',
                            specific_dates: selectedDates.map(d => Timestamp.fromDate(d)),
                            date_configurations: dateConfigurations // Save the map
                        });
                    } else {
                        // Fallback if both (though UI tries to prevent)
                        allDates = [...allDates, ...selectedDates];
                    }
                }

                // 3. Deduplicate dates
                const uniqueDates = Array.from(new Set(allDates.map(d => d.toDateString())))
                    .map(d => new Date(d));

                if (uniqueDates.length === 0) {
                    throw new Error("Please select a date range OR specific dates.");
                }

                // Create tasks for each unique date
                for (const date of uniqueDates) {
                    const dateStr = date.toISOString().split('T')[0];
                    const dateConfig = dateConfigurations[dateStr];

                    // Use per-date config if available, otherwise use global platforms
                    const datePlatforms = dateConfig && dateConfig.platforms.length > 0
                        ? dateConfig.platforms
                        : selectedPlatforms;

                    // Determine Count: Per-date config -> Global taskCount -> Default 1
                    const dateTaskCount = dateConfig && dateConfig.adCount
                        ? parseInt(dateConfig.adCount)
                        : parseInt(formData.taskCount);

                    if (datePlatforms.length === 0) {
                        console.warn(`Skipping ${dateStr} - no platforms configured`);
                        continue;
                    }

                    const taskData = {
                        created_at: serverTimestamp(),
                        status: formData.assignTo ? 'Assigned' : 'Pending',
                        client: formData.client,
                        brand: formData.brand,
                        program: formData.program,
                        description: formData.description,
                        platform: datePlatforms,
                        due_date: Timestamp.fromDate(date),
                        ad_count: 1, // Defaulting internal ad_count to 1 as strict multiplicity is now handled by task_count
                        task_count: dateTaskCount, // This is the Multiplier
                        // Flutter Compatibility Fields
                        title: `${formData.brand} - ${formData.program}`,
                        date: Timestamp.fromDate(date),
                        priority: 'Medium',
                        assignedBy: currentUser?.uid || 'System'
                    };

                    if (formData.assignTo) {
                        taskData.editor_id = formData.assignTo;
                        taskData.assignedTo = formData.assignTo;
                    }
                    if (formData.assignedTeam) {
                        taskData.assigned_team = formData.assignedTeam;
                    }

                    // SINGLE DOCUMENT CREATION
                    await addDoc(collection(db, 'tasks'), taskData);
                    tasksCreated++;
                }
            }

            // Save the Log
            await addDoc(collection(db, 'schedule_logs'), logData);

            setSuccess(`${tasksCreated} task(s) created successfully!`);
            setFormData({
                client: '',
                brand: '',
                program: '',
                description: '',
                dueDate: '',
                endDate: '',
                adCount: 1,
                taskCount: 1,
                assignTo: '',
                assignedTeam: '',
                platforms: { facebook: false, youtube: false, tiktok: false },
                recurring: false,
                frequency: 'daily'
            });
            setSelectedDates([]);
            setDateConfigurations({});
        } catch (err) {
            if (err.code === 'permission-denied') {
                setError("Failed to create task: Missing or insufficient permissions. Please contact your administrator to update your Firestore rules.");
            } else {
                setError("Failed to create task: " + err.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const duplicateLastTask = () => {
        setFormData(prev => ({
            ...prev,
            dueDate: '',
            endDate: ''
        }));
        setSuccess('Form duplicated! Set new dates and submit.');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading form data...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn pb-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gradient">Schedule Tasks</h1>
                    <p className="text-slate-600 font-medium mt-1">Create single or multiple brand sheets for production</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={duplicateLastTask}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm text-slate-700 font-bold rounded-xl hover:bg-white hover:shadow-md transition-all border border-slate-200"
                    >
                        <Copy size={18} />
                        Duplicate
                    </button>
                    <button
                        onClick={() => setBulkMode(!bulkMode)}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm hover:shadow-md",
                            bulkMode
                                ? "gradient-primary text-white border-transparent"
                                : "bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white"
                        )}
                    >
                        <Calendar size={18} />
                        {bulkMode ? 'Single Task' : 'Bulk Schedule'}
                    </button>
                </div>
            </div>

            <div className="card-glass rounded-2xl shadow-premium p-8 animate-slideUp">
                {error && (
                    <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50/80 backdrop-blur-sm border border-green-100 text-green-700 rounded-xl flex items-center gap-3 shadow-sm">
                        <CheckSquare size={20} />
                        <span className="font-medium">{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="mb-6">
                        <SearchableSelect
                            label="Client"
                            required
                            allowCreate
                            options={clients}
                            value={formData.client}
                            onChange={(val) => setFormData({ ...formData, client: val })}
                            placeholder="Select or Create Client"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <SearchableSelect
                                label="Brand"
                                required
                                options={brands}
                                value={formData.brand}
                                onChange={(val) => setFormData({ ...formData, brand: val })}
                                placeholder="Select Brand"
                            />
                        </div>

                        <div>
                            <SearchableSelect
                                label="Program"
                                required
                                options={programs}
                                value={formData.program}
                                onChange={(val) => setFormData({ ...formData, program: val })}
                                placeholder="Select Program"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description *</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Task details..."
                        />
                    </div>

                    {bulkMode ? (
                        <div className="space-y-6">
                            {/* SECTION 1: DATE SELECTION */}
                            <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-6 rounded-2xl border-2 border-blue-100 shadow-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                        <Calendar size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Step 1: Select Dates</h3>
                                        <p className="text-sm text-slate-600">Choose ONE method: Date Range OR Calendar</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Date Range Option */}
                                    {selectedDates.length === 0 && (
                                        <div className="bg-white/70 rounded-xl p-5 border border-blue-100">
                                            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">A</div>
                                                Date Range
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Start Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                                        value={formData.dueDate}
                                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">End Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                                        value={formData.endDate}
                                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Frequency</label>
                                                    <select
                                                        className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                                        value={formData.frequency}
                                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                                    >
                                                        <option value="daily">Daily</option>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* OR Divider */}
                                    {!formData.dueDate && selectedDates.length === 0 && (
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-px bg-blue-200"></div>
                                            <span className="text-sm font-bold text-blue-600">OR</span>
                                            <div className="flex-1 h-px bg-blue-200"></div>
                                        </div>
                                    )}

                                    {/* Calendar Picker Option */}
                                    {!formData.dueDate && (
                                        <div className="bg-white/70 rounded-xl p-5 border border-blue-100">
                                            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">B</div>
                                                Select Specific Dates
                                            </h4>

                                            <div className="space-y-3">
                                                {selectedDates.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                        {selectedDates.map((date, index) => (
                                                            <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium text-sm shadow-sm">
                                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newDates = selectedDates.filter((_, i) => i !== index);
                                                                        setSelectedDates(newDates);
                                                                    }}
                                                                    className="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded p-0.5"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowCalendar(true);
                                                        setTempSelectedDates(selectedDates);
                                                    }}
                                                    className="w-full px-4 py-2.5 bg-blue-500 text-white border border-blue-600 rounded-lg hover:bg-blue-600 transition font-medium flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Plus size={16} />
                                                    {selectedDates.length > 0 ? 'Modify Selected Dates' : 'Select Dates from Calendar'}
                                                </button>

                                                {/* Calendar Popup Modal */}
                                                {showCalendar && (
                                                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                                                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slideUp">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-bold">Select Dates</h3>
                                                                <button type="button" onClick={() => setShowCalendar(false)} className="p-2 hover:bg-gray-100 rounded">
                                                                    <X size={20} />
                                                                </button>
                                                            </div>

                                                            <div className="mb-4">
                                                                <ReactCalendar
                                                                    value={null}
                                                                    onClickDay={(value) => {
                                                                        const date = new Date(value);
                                                                        const dateStr = date.toDateString();
                                                                        const exists = tempSelectedDates.some(d => d.toDateString() === dateStr);

                                                                        if (exists) {
                                                                            setTempSelectedDates(tempSelectedDates.filter(d => d.toDateString() !== dateStr));
                                                                        } else {
                                                                            setTempSelectedDates([...tempSelectedDates, date].sort((a, b) => a - b));
                                                                        }
                                                                    }}
                                                                    tileClassName={({ date }) => {
                                                                        const isSelected = tempSelectedDates.some(d => d.toDateString() === date.toDateString());
                                                                        return isSelected ? "bg-blue-600 text-white rounded-full font-bold" : "";
                                                                    }}
                                                                />
                                                            </div>

                                                            {tempSelectedDates.length > 0 && (
                                                                <div className="mb-4 p-3 bg-slate-50 rounded-lg max-h-32 overflow-y-auto">
                                                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                                                        Selected ({tempSelectedDates.length})
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {tempSelectedDates.map((date, idx) => (
                                                                            <span key={idx} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-700 font-medium">
                                                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowCalendar(false)}
                                                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedDates(tempSelectedDates);
                                                                        setShowCalendar(false);
                                                                    }}
                                                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                                                                >
                                                                    Confirm Selection
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Date Summary */}
                                    {(formData.dueDate || selectedDates.length > 0) && (
                                        <div className="bg-blue-100/50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm font-bold text-blue-900 mb-1">
                                                📅 Total Dates: {
                                                    (() => {
                                                        let count = selectedDates.length;
                                                        if (formData.dueDate && formData.endDate) {
                                                            const start = new Date(formData.dueDate);
                                                            const end = new Date(formData.endDate);
                                                            let tempCount = 0;
                                                            let current = new Date(start);
                                                            while (current <= end) {
                                                                tempCount++;
                                                                if (formData.frequency === 'daily') current.setDate(current.getDate() + 1);
                                                                else if (formData.frequency === 'weekly') current.setDate(current.getDate() + 7);
                                                                else if (formData.frequency === 'monthly') current.setMonth(current.getMonth() + 1);
                                                            }
                                                            count = tempCount;
                                                        }
                                                        return count;
                                                    })()
                                                }
                                            </p>
                                            {formData.dueDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, dueDate: '', endDate: '' })}
                                                    className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline font-medium"
                                                >
                                                    Clear and use calendar instead
                                                </button>
                                            )}
                                            {selectedDates.length > 0 && !formData.dueDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDates([]);
                                                        setDateConfigurations({});
                                                    }}
                                                    className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline font-medium"
                                                >
                                                    Clear and use date range instead
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: PER-DATE CONFIGURATION (Only for Calendar Selection) */}
                            {selectedDates.length > 0 && !formData.dueDate && (
                                <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm p-6 rounded-2xl border-2 border-purple-100 shadow-md">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500 rounded-lg">
                                                <Users size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">Step 2: Configure Each Date</h3>
                                                <p className="text-sm text-slate-600">Set platforms and ad counts for each selected date</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDates([]);
                                                setDateConfigurations({});
                                            }}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium flex items-center gap-2 shadow-sm"
                                        >
                                            <Trash2 size={16} />
                                            Clear All
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedDates.map((date, index) => {
                                            const dateStr = date.toISOString().split('T')[0];
                                            const config = dateConfigurations[dateStr] || { platforms: [], adCount: 1 };

                                            return (
                                                <div key={index} className="bg-white/70 rounded-xl p-5 border-2 border-purple-100">
                                                    <h4 className="text-sm font-bold text-slate-700 mb-4">
                                                        📅 {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </h4>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 mb-2">Platforms *</label>
                                                            <div className="space-y-2">
                                                                {['facebook', 'youtube', 'tiktok'].map((platform) => (
                                                                    <label key={platform} className="flex items-center gap-2 cursor-pointer group">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                                            checked={config.platforms.includes(platform)}
                                                                            onChange={(e) => {
                                                                                const newPlatforms = e.target.checked
                                                                                    ? [...config.platforms, platform]
                                                                                    : config.platforms.filter(p => p !== platform);
                                                                                setDateConfigurations(prev => ({
                                                                                    ...prev,
                                                                                    [dateStr]: { ...config, platforms: newPlatforms }
                                                                                }));
                                                                            }}
                                                                        />
                                                                        <span className="text-sm font-medium text-slate-700 group-hover:text-purple-600 transition-colors capitalize">
                                                                            {platform}
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-600 mb-2">Ad Count (Copies)</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-sm"
                                                                value={config.adCount}
                                                                onChange={(e) => {
                                                                    setDateConfigurations(prev => ({
                                                                        ...prev,
                                                                        [dateStr]: { ...config, adCount: parseInt(e.target.value) || 1 }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Task Configuration */}
                            <div className="bg-white/50 rounded-xl p-5 border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Users size={16} className="text-slate-600" />
                                    Task Configuration
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Assign To field removed */}
                                    {/* <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Assign To (Optional)</label>
                                        <select ... > ... </select>
                                    </div> */}

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Assign Team *</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                            value={formData.assignedTeam}
                                            onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
                                        >
                                            <option value="">Select Team</option>
                                            <option value="News">News</option>
                                            <option value="Teledrama">Teledrama</option>
                                        </select>
                                    </div>

                                    {/* Task Count - Only visible for date range selection */}
                                    {formData.dueDate && (
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Ad Count (Copies)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                required
                                                className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                                value={formData.taskCount}
                                                onChange={(e) => setFormData({ ...formData, taskCount: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Due Date *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>

                            {/* Assign To field removed */}
                            {/* <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Assign To (Optional)</label>
                                <select...
                            </div> */}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Assign Team *</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.assignedTeam}
                                    onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
                                >
                                    <option value="">Select Team</option>
                                    <option value="News">News</option>
                                    <option value="Teledrama">Teledrama</option>
                                </select>
                            </div>

                            {/* Ad Count Removed */}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Ad Count (Copies)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    required
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.taskCount}
                                    onChange={(e) => setFormData({ ...formData, taskCount: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Platform Selection - Hidden when using calendar dates (platforms configured per-date) */}
                    {(!bulkMode || (bulkMode && formData.dueDate) || (bulkMode && selectedDates.length === 0)) && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Platforms *</label>
                            <div className="flex gap-4 pt-2">
                                {['Facebook', 'YouTube', 'TikTok'].map(platform => (
                                    <label key={platform} className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={formData.platforms[platform.toLowerCase()]}
                                                onChange={() => handlePlatformChange(platform.toLowerCase())}
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                                <div className="w-2.5 h-1.5 border-b-2 border-l-2 border-white -rotate-45 mt-[-2px] opacity-0 peer-checked:opacity-100"></div>
                                            </div>
                                        </div>
                                        <span className="text-base font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                            {platform}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full gradient-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={22} />
                        Create
                    </button>
                </form>
            </div >
        </div >
    );
}

