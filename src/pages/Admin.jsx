import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, query, deleteDoc, writeBatch } from 'firebase/firestore';
import { Plus, Tag, Layers, X, Users, Shield, Search, Trash2, Download, BarChart3, UserCheck, CheckSquare, Square, Edit, Save, UserPlus } from 'lucide-react';

import clsx from 'clsx';

export default function Admin() {
    const navigate = useNavigate();
    const [brand, setBrand] = useState('');
    const [program, setProgram] = useState('');
    const [bulkBrands, setBulkBrands] = useState('');
    const [bulkPrograms, setBulkPrograms] = useState('');
    const [showBulkBrand, setShowBulkBrand] = useState(false);
    const [showBulkProgram, setShowBulkProgram] = useState(false);
    const [loading, setLoading] = useState({ brand: false, program: false, bulkBrand: false, bulkProgram: false });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchUser, setSearchUser] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterTeam, setFilterTeam] = useState('all');

    // State for Lists
    const [lists, setLists] = useState({ brands: [], programs: [] });
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Bulk Delete & Edit States
    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [editingTask, setEditingTask] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        type: 'single', // 'single' or 'bulk'
        taskId: null,
        taskName: '',
        count: 0
    });

    // Task Management Filters
    const [taskFilters, setTaskFilters] = useState({
        brand: 'all',
        program: 'all',
        status: 'all',
        team: 'all'
    });

    const handleClearTaskFilters = () => {
        setTaskFilters({
            brand: 'all',
            program: 'all',
            status: 'all',
            team: 'all'
        });
        setSearchUser('');
    };

    useEffect(() => {
        // Fetch Metadata Lists
        const docRef = doc(db, 'metadata', 'lists');
        const unsubLists = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setLists(doc.data());
            }
        });

        // Fetch Users
        const qUsers = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
        });

        // Fetch Tasks for stats
        const qTasks = query(collection(db, 'tasks'));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
        });

        return () => {
            unsubLists();
            unsubUsers();
            unsubTasks();
        };
    }, []);

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: newRole
            });
            setMessage({ type: 'success', text: 'User role updated successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error updating role:", error);
            setMessage({ type: 'error', text: 'Failed to update user role' });
        }
    };

    const handleUpdateTeam = async (userId, newTeam) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                team: newTeam
            });
            setMessage({ type: 'success', text: 'User team updated successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error updating team:", error);
            setMessage({ type: 'error', text: 'Failed to update user team' });
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, 'users', userId));
            setMessage({ type: 'success', text: 'User deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error deleting user:", error);
            setMessage({ type: 'error', text: 'Failed to delete user' });
        }
    };

    const handleDeleteTask = (taskId, taskName) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'single',
            taskId: taskId,
            taskName: taskName || 'Untitled Task',
            count: 1
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.isOpen) return;

        try {
            if (deleteConfirmation.type === 'single') {
                await deleteDoc(doc(db, 'tasks', deleteConfirmation.taskId));
                setMessage({ type: 'success', text: 'Task deleted successfully' });
            } else if (deleteConfirmation.type === 'bulk') {
                const batch = writeBatch(db);
                selectedTasks.forEach(taskId => {
                    const docRef = doc(db, 'tasks', taskId);
                    batch.delete(docRef);
                });
                await batch.commit();
                setSelectedTasks(new Set());
                setMessage({ type: 'success', text: 'Tasks deleted successfully' });
            }

            setDeleteConfirmation({ isOpen: false, type: 'single', taskId: null, taskName: '', count: 0 });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error deleting:", error);
            setMessage({ type: 'error', text: 'Failed to delete: ' + error.message });
            setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
        }
    };

    // Bulk Delete Handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = tasks.map(t => t.id);
            setSelectedTasks(new Set(allIds));
        } else {
            setSelectedTasks(new Set());
        }
    };

    const handleSelectTask = (taskId) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleBulkDelete = () => {
        if (selectedTasks.size === 0) return;
        setDeleteConfirmation({
            isOpen: true,
            type: 'bulk',
            taskId: null,
            taskName: '',
            count: selectedTasks.size
        });
    };

    // Edit Task Handlers
    const handleEditClick = (task) => {
        setEditingTask({ ...task });
        setIsEditModalOpen(true);
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        if (!editingTask) return;

        try {
            const taskRef = doc(db, 'tasks', editingTask.id);
            // Create a clean object to update, removing UI-specific fields if any
            const { id, ...updateData } = editingTask;

            // Fix assigned_team and editor_id if needed
            if (!updateData.assigned_team) updateData.assigned_team = null;
            if (!updateData.editor_id) updateData.editor_id = null;

            await updateDoc(taskRef, updateData);

            setIsEditModalOpen(false);
            setEditingTask(null);
            setMessage({ type: 'success', text: 'Task updated successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error updating task:", error);
            setMessage({ type: 'error', text: 'Failed to update task' });
        }
    };

    const handleAddBrand = async (e) => {
        e.preventDefault();
        if (!brand.trim()) return;

        setLoading(prev => ({ ...prev, brand: true }));
        try {
            const docRef = doc(db, 'metadata', 'lists');
            await updateDoc(docRef, {
                brands: arrayUnion(brand.trim())
            });
            setBrand('');
            setMessage({ type: 'success', text: 'Brand added successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error adding brand:", error);
            setMessage({ type: 'error', text: 'Failed to add brand' });
        } finally {
            setLoading(prev => ({ ...prev, brand: false }));
        }
    };

    const handleDeleteBrand = async (brandToDelete) => {
        if (!window.confirm(`Delete "${brandToDelete}"? This won't affect existing tasks.`)) return;

        try {
            const docRef = doc(db, 'metadata', 'lists');
            await updateDoc(docRef, {
                brands: arrayRemove(brandToDelete)
            });
            setMessage({ type: 'success', text: 'Brand deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error deleting brand:", error);
            setMessage({ type: 'error', text: 'Failed to delete brand' });
        }
    };

    const handleAddProgram = async (e) => {
        e.preventDefault();
        if (!program.trim()) return;

        setLoading(prev => ({ ...prev, program: true }));
        try {
            const docRef = doc(db, 'metadata', 'lists');
            await updateDoc(docRef, {
                programs: arrayUnion(program.trim())
            });
            setProgram('');
            setMessage({ type: 'success', text: 'Program added successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error adding program:", error);
            setMessage({ type: 'error', text: 'Failed to add program' });
        } finally {
            setLoading(prev => ({ ...prev, program: false }));
        }
    };

    const handleDeleteProgram = async (programToDelete) => {
        if (!window.confirm(`Delete "${programToDelete}"? This won't affect existing tasks.`)) return;

        try {
            const docRef = doc(db, 'metadata', 'lists');
            await updateDoc(docRef, {
                programs: arrayRemove(programToDelete)
            });
            setMessage({ type: 'success', text: 'Program deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error deleting program:", error);
            setMessage({ type: 'error', text: 'Failed to delete program' });
        }
    };

    const handleBulkAddBrands = async (e) => {
        e.preventDefault();
        if (!bulkBrands.trim()) return;

        setLoading(prev => ({ ...prev, bulkBrand: true }));
        try {
            const brandsArray = bulkBrands
                .split('\n')
                .map(b => b.trim())
                .filter(b => b.length > 0);

            const docRef = doc(db, 'metadata', 'lists');

            for (const brandItem of brandsArray) {
                await updateDoc(docRef, {
                    brands: arrayUnion(brandItem)
                });
            }

            setBulkBrands('');
            setShowBulkBrand(false);
            setMessage({ type: 'success', text: `${brandsArray.length} brand(s) added successfully` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error adding brands:", error);
            setMessage({ type: 'error', text: 'Failed to add brands' });
        } finally {
            setLoading(prev => ({ ...prev, bulkBrand: false }));
        }
    };

    const handleBulkAddPrograms = async (e) => {
        e.preventDefault();
        if (!bulkPrograms.trim()) return;

        setLoading(prev => ({ ...prev, bulkProgram: true }));
        try {
            const programsArray = bulkPrograms
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            const docRef = doc(db, 'metadata', 'lists');

            for (const programItem of programsArray) {
                await updateDoc(docRef, {
                    programs: arrayUnion(programItem)
                });
            }

            setBulkPrograms('');
            setShowBulkProgram(false);
            setMessage({ type: 'success', text: `${programsArray.length} program(s) added successfully` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error adding programs:", error);
            setMessage({ type: 'error', text: 'Failed to add programs' });
        } finally {
            setLoading(prev => ({ ...prev, bulkProgram: false }));
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
            user.name?.toLowerCase().includes(searchUser.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesTeam = filterTeam === 'all' || (filterTeam === 'none' ? !user.team : user.team === filterTeam);
        return matchesSearch && matchesRole && matchesTeam;
    });

    // Calculate stats
    const stats = {
        totalUsers: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        schedulers: users.filter(u => u.role === 'scheduler').length,
        editors: users.filter(u => u.role === 'editor').length,
        totalTasks: tasks.length,
        totalBrands: lists.brands?.length || 0,
        totalPrograms: lists.programs?.length || 0
    };



    return (
        <div className="max-w-7xl mx-auto animate-fadeIn pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gradient">Admin Panel</h1>
                <p className="text-slate-600 font-medium mt-1">Manage users, brands, programs, and system settings</p>
            </div>

            {message.text && (
                <div className={clsx(
                    "mb-6 p-4 rounded-lg flex items-center justify-between",
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })} className="p-1 hover:bg-white/50 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="card-glass p-6 rounded-2xl shadow-premium hover:shadow-premium-lg transition-all transform hover:scale-105 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-xl shadow-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalUsers}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Users</div>
                        </div>
                    </div>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium hover:shadow-premium-lg transition-all transform hover:scale-105 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-400 to-pink-600 text-white rounded-xl shadow-lg">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalTasks}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Tasks</div>
                        </div>
                    </div>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium hover:shadow-premium-lg transition-all transform hover:scale-105 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 text-white rounded-xl shadow-lg">
                            <Tag size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalBrands}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Brands</div>
                        </div>
                    </div>
                </div>

                <div className="card-glass p-6 rounded-2xl shadow-premium hover:shadow-premium-lg transition-all transform hover:scale-105 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-xl shadow-lg">
                            <Layers size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{stats.totalPrograms}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Programs</div>
                        </div>
                    </div>

                </div>
            </div>



            {/* User Management */}
            <div className="card-glass rounded-2xl shadow-premium mb-8 overflow-hidden animate-slideUp" style={{ animationDelay: '0.5s' }}>
                <div className="p-6 border-b border-white/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 gradient-primary text-white rounded-xl shadow-lg">
                                <Users size={20} />
                            </div>
                            <h3 className="font-bold text-xl text-gradient">User Management</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/signup')}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-glow transform hover:scale-105 animate-fadeIn"
                            >
                                <UserPlus size={18} />
                                Add New User
                            </button>
                            <div className="text-sm font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-lg">
                                {filteredUsers.length} of {users.length} users
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by email or name..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="scheduler">Scheduler</option>
                            <option value="editor">Editor</option>
                            <option value="Auditor">Auditor</option>
                        </select>
                        <select
                            className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                            value={filterTeam}
                            onChange={(e) => setFilterTeam(e.target.value)}
                        >
                            <option value="all">All Teams</option>
                            <option value="News">News</option>
                            <option value="Teledrama">Teledrama</option>
                            <option value="none">No Team</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Team</th>
                                <th className="px-6 py-4">Change Role</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold">
                                                {user.name ? user.name[0].toUpperCase() : <UserCheck size={14} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.name || 'No name'}</div>
                                                <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-bold shadow-sm",
                                            user.role === 'admin' && 'bg-purple-100 text-purple-700 border border-purple-200',
                                            user.role === 'scheduler' && 'bg-blue-100 text-blue-700 border border-blue-200',
                                            user.role === 'editor' && 'bg-green-100 text-green-700 border border-green-200',
                                            !user.role && 'bg-slate-100 text-slate-700 border border-slate-200'
                                        )}>
                                            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Editor'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.team || 'none'}
                                            onChange={(e) => handleUpdateTeam(user.id, e.target.value === 'none' ? null : e.target.value)}
                                            className="px-3 py-1.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300"
                                        >
                                            <option value="none">No Team</option>
                                            <option value="News">News</option>
                                            <option value="Teledrama">Teledrama</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role || 'editor'}
                                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            className="px-3 py-1.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="scheduler">Scheduler</option>
                                            <option value="editor">Editor</option>
                                            <option value="Auditor">Auditor</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all transform hover:scale-110"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


                {/* Task Management */}
                <div className="card-glass rounded-2xl shadow-premium mb-8 overflow-hidden animate-slideUp" style={{ animationDelay: '0.55s' }}>
                    <div className="p-6 border-b border-white/30 bg-gradient-to-r from-orange-500/10 to-red-500/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-xl shadow-lg">
                                    <Layers size={20} />
                                </div>
                                <h3 className="font-bold text-xl text-gradient">Task Management</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedTasks.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors animate-fadeIn"
                                    >
                                        <Trash2 size={18} />
                                        Delete ({selectedTasks.size})
                                    </button>
                                )}
                                <div className="text-sm font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-lg">
                                    {tasks.filter(t => {
                                        // 1. Search Filter
                                        const matchesSearch =
                                            (t.program || '').toLowerCase().includes(searchUser.toLowerCase()) ||
                                            (t.brand || '').toLowerCase().includes(searchUser.toLowerCase());

                                        // 2. Dropdown Filters
                                        const matchesBrand = taskFilters.brand === 'all' || t.brand === taskFilters.brand;
                                        const matchesProgram = taskFilters.program === 'all' || t.program === taskFilters.program;
                                        const matchesStatus = taskFilters.status === 'all' || t.status === taskFilters.status;
                                        const matchesTeam = taskFilters.team === 'all' || t.assigned_team === taskFilters.team;

                                        return matchesSearch && matchesBrand && matchesProgram && matchesStatus && matchesTeam;
                                    }).length} tasks found
                                </div>
                            </div>
                        </div>

                        {/* Filter Controls */}
                        <div className="flex flex-wrap gap-4 mb-4 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                            {/* Brand Filter */}
                            <div className="flex-1 min-w-[200px]">
                                <select
                                    value={taskFilters.brand}
                                    onChange={(e) => setTaskFilters({ ...taskFilters, brand: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/80 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-600 font-medium"
                                >
                                    <option value="all">All Brands</option>
                                    {[...new Set(tasks.map(t => t.brand).filter(Boolean))].map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Program Filter */}
                            <div className="flex-1 min-w-[200px]">
                                <select
                                    value={taskFilters.program}
                                    onChange={(e) => setTaskFilters({ ...taskFilters, program: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/80 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-600 font-medium"
                                >
                                    <option value="all">All Programs</option>
                                    {[...new Set(tasks.map(t => t.program).filter(Boolean))].map(prog => (
                                        <option key={prog} value={prog}>{prog}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex-1 min-w-[150px]">
                                <select
                                    value={taskFilters.status}
                                    onChange={(e) => setTaskFilters({ ...taskFilters, status: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/80 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-600 font-medium"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Assigned">Assigned</option>
                                    <option value="In_Review">In Review</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            {/* Team Filter */}
                            <div className="flex-1 min-w-[150px]">
                                <select
                                    value={taskFilters.team}
                                    onChange={(e) => setTaskFilters({ ...taskFilters, team: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white/80 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-600 font-medium"
                                >
                                    <option value="all">All Teams</option>
                                    <option value="News">News</option>
                                    <option value="Teledrama">Teledrama</option>
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            {(taskFilters.brand !== 'all' || taskFilters.program !== 'all' || taskFilters.status !== 'all' || taskFilters.team !== 'all' || searchUser) && (
                                <button
                                    onClick={handleClearTaskFilters}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                                >
                                    <X size={18} />
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Search Tasks (with Margin Bottom) */}
                        <div className="relative group mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search tasks by Program or Brand..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                value={searchUser} // Reusing searchUser state for simplicity, or create new searchTask state
                                onChange={(e) => setSearchUser(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-xs sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-4">
                                        <button
                                            onClick={(e) => {
                                                e.target.checked = !selectedTasks.size || selectedTasks.size < tasks.length;
                                                handleSelectAll({ target: { checked: !selectedTasks.size || selectedTasks.size < tasks.length } });
                                            }}
                                            className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                                        >
                                            {selectedTasks.size > 0 && selectedTasks.size === tasks.length ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Program / Brand</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Due Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tasks
                                    .filter(t => {
                                        // 1. Search Filter (existing)
                                        const matchesSearch =
                                            (t.program || '').toLowerCase().includes(searchUser.toLowerCase()) ||
                                            (t.brand || '').toLowerCase().includes(searchUser.toLowerCase());

                                        // 2. Dropdown Filters
                                        const matchesBrand = taskFilters.brand === 'all' || t.brand === taskFilters.brand;
                                        const matchesProgram = taskFilters.program === 'all' || t.program === taskFilters.program;
                                        const matchesStatus = taskFilters.status === 'all' || t.status === taskFilters.status;
                                        // Note: assigned_team might be on the task, or we might need to look up editor's team? 
                                        // For now assuming 'assigned_team' field exists on task as per previous tasks.
                                        const matchesTeam = taskFilters.team === 'all' || t.assigned_team === taskFilters.team;

                                        return matchesSearch && matchesBrand && matchesProgram && matchesStatus && matchesTeam;
                                    })
                                    .sort((a, b) => (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0))
                                    .map(task => (
                                        <tr key={task.id} className={clsx("hover:bg-orange-50/30 transition-colors", selectedTasks.has(task.id) && "bg-orange-50")}>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleSelectTask(task.id)}
                                                    className={clsx("transition-colors", selectedTasks.has(task.id) ? "text-orange-600" : "text-slate-400 hover:text-slate-600")}
                                                >
                                                    {selectedTasks.has(task.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-bold text-slate-800">{task.program}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{task.brand}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-full text-xs font-bold shadow-sm",
                                                    task.status === 'Pending' && 'bg-yellow-100 text-yellow-700 border border-yellow-200',
                                                    task.status === 'Assigned' && 'bg-blue-100 text-blue-700 border border-blue-200',
                                                    task.status === 'In_Review' && 'bg-purple-100 text-purple-700 border border-purple-200',
                                                    task.status === 'Completed' && 'bg-green-100 text-green-700 border border-green-200'
                                                )}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {task.due_date?.toDate().toLocaleDateString() || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(task)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all transform hover:scale-110"
                                                        title="Edit Task"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <div className="relative z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault(); // Extra safety
                                                                handleDeleteTask(task.id, task.program);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all transform hover:scale-110 cursor-pointer pointer-events-auto"
                                                            title="Delete Task"
                                                            data-testid={`delete-task-${task.id}`}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand Management */}
                    {/* Brand Management */}
                    <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.6s' }}>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/30">
                            <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-xl shadow-md">
                                <Tag size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gradient">Manage Brands</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{lists.brands?.length || 0} brands</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddBrand} className="space-y-4 mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    placeholder="Add new brand..."
                                />
                                <button
                                    type="submit"
                                    disabled={loading.brand || !brand.trim()}
                                    className="px-5 py-2.5 gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add
                                </button>
                            </div>
                        </form>

                        {/* Bulk Import Toggle */}
                        <button
                            onClick={() => setShowBulkBrand(!showBulkBrand)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-bold mb-4 flex items-center gap-1 transition-colors"
                        >
                            {showBulkBrand ? '− Hide' : '+ Show'} Bulk Import
                        </button>

                        {/* Bulk Import Form */}
                        {showBulkBrand && (
                            <form onSubmit={handleBulkAddBrands} className="mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Bulk Add Brands (one per line)
                                </label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-3 font-medium"
                                    value={bulkBrands}
                                    onChange={(e) => setBulkBrands(e.target.value)}
                                    placeholder="Brand 1&#10;Brand 2&#10;Brand 3&#10;..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={loading.bulkBrand || !bulkBrands.trim()}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
                                    >
                                        {loading.bulkBrand ? 'Adding...' : 'Add All Brands'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkBrand(false);
                                            setBulkBrands('');
                                        }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex flex-wrap gap-2">
                                {lists.brands?.map((b, i) => (
                                    <span key={i} className="pl-3 pr-1 py-1.5 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 flex items-center gap-2 group hover:border-indigo-300 hover:shadow-sm transition-all">
                                        {b}
                                        <button
                                            onClick={() => handleDeleteBrand(b)}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Brand"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                                {(!lists.brands || lists.brands.length === 0) && (
                                    <span className="text-sm text-slate-400 italic font-medium">No brands added yet.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Program Management */}
                    {/* Program Management */}
                    <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp" style={{ animationDelay: '0.7s' }}>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/30">
                            <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-600 text-white rounded-xl shadow-md">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gradient">Manage Programs</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{lists.programs?.length || 0} programs</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddProgram} className="space-y-4 mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium"
                                    value={program}
                                    onChange={(e) => setProgram(e.target.value)}
                                    placeholder="Add new program..."
                                />
                                <button
                                    type="submit"
                                    disabled={loading.program || !program.trim()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-glow transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add
                                </button>
                            </div>
                        </form>

                        {/* Bulk Import Toggle */}
                        <button
                            onClick={() => setShowBulkProgram(!showBulkProgram)}
                            className="text-sm text-purple-600 hover:text-purple-800 font-bold mb-4 flex items-center gap-1 transition-colors"
                        >
                            {showBulkProgram ? '− Hide' : '+ Show'} Bulk Import
                        </button>

                        {/* Bulk Import Form */}
                        {showBulkProgram && (
                            <form onSubmit={handleBulkAddPrograms} className="mb-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Bulk Add Programs (one per line)
                                </label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none mb-3 font-medium"
                                    value={bulkPrograms}
                                    onChange={(e) => setBulkPrograms(e.target.value)}
                                    placeholder="Program 1&#10;Program 2&#10;Program 3&#10;..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={loading.bulkProgram || !bulkPrograms.trim()}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-md"
                                    >
                                        {loading.bulkProgram ? 'Adding...' : 'Add All Programs'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkProgram(false);
                                            setBulkPrograms('');
                                        }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex flex-wrap gap-2">
                                {lists.programs?.map((p, i) => (
                                    <span key={i} className="pl-3 pr-1 py-1.5 bg-white text-slate-700 rounded-lg text-sm font-medium border border-slate-200 flex items-center gap-2 group hover:border-purple-300 hover:shadow-sm transition-all">
                                        {p}
                                        <button
                                            onClick={() => handleDeleteProgram(p)}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Program"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                                {(!lists.programs || lists.programs.length === 0) && (
                                    <span className="text-sm text-slate-400 italic font-medium">No programs added yet.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            {/* Edit Task Modal */}
            {
                isEditModalOpen && editingTask && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="card-glass p-8 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-slideUp max-h-[90vh] overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-gradient">Edit Task</h3>
                                <p className="text-slate-600 font-medium">Update task details and assignments</p>
                            </div>
                            <form onSubmit={handleUpdateTask} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Brand</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.brand || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, brand: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Program</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.program || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, program: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        rows={3}
                                        value={editingTask.description || ''}
                                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.due_date ? new Date(editingTask.due_date.seconds * 1000).toISOString().split('T')[0] : ''}
                                            onChange={(e) => {
                                                const date = new Date(e.target.value);
                                                setEditingTask({ ...editingTask, due_date: date });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.status || 'Pending'}
                                            onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Assigned">Assigned</option>
                                            <option value="In_Review">In Review</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Assign To Team</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.assigned_team || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, assigned_team: e.target.value })}
                                        >
                                            <option value="">No Team</option>
                                            <option value="News">News</option>
                                            <option value="Teledrama">Teledrama</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Assign To Editor</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white/50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                            value={editingTask.editor_id || ''}
                                            onChange={(e) => setEditingTask({ ...editingTask, editor_id: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.filter(u => u.role === 'editor').map(user => (
                                                <option key={user.id} value={user.id}>{user.name || user.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-4 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTask(null);
                                            setIsEditModalOpen(false);
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
                            <p className="text-slate-600 mb-8">
                                {deleteConfirmation.type === 'single'
                                    ? `Are you sure you want to delete "${deleteConfirmation.taskName}"?`
                                    : `Are you sure you want to delete ${deleteConfirmation.count} selected tasks?`
                                }
                                <br />
                                <span className="text-red-500 font-bold text-sm mt-2 block">This action cannot be undone.</span>
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg hover:shadow-red-500/30 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
