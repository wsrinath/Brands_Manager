
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, User, ExternalLink, CheckCircle, Youtube, Facebook, Video, Layers, X, Filter, Tag, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function Editor() {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser, userRole } = useAuth();
    const [userTeam, setUserTeam] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [links, setLinks] = useState({ youtube: '', facebook: '', tiktok: '' });
    const [filters, setFilters] = useState({
        editor: 'all',
        programme: 'all',
        brand: 'all',
        client: 'all',
        team: 'all',
        startDate: '',
        endDate: ''
    });
    const [searchFilters, setSearchFilters] = useState({
        editor: '',
        programme: '',
        brand: '',
        client: '',
        team: ''
    });
    const [programmeStats, setProgrammeStats] = useState([]);
    const [allEditors, setAllEditors] = useState([]);
    const [editorStats, setEditorStats] = useState([]);
    const [validationSummaries, setValidationSummaries] = useState({ youtube: null, facebook: null, tiktok: null });

    const handleDeleteTask = async (taskId) => {
        if (window.confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'tasks', taskId));
                // Toast or alert is optional since it's real-time, but a simple alert is fine or nothing.
            } catch (error) {
                console.error("Error deleting task:", error);
                alert("Failed to delete task: " + error.message);
            }
        }
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

        const confirmMessage = `WARNING: You are about to DELETE ${filteredTasks.length} tasks.\n\nThis action CANNOT be undone.\n\nAre you sure you want to continue?`;

        if (window.confirm(confirmMessage)) {
            // Double confirmation for safety
            if (!window.confirm(`Final Confirmation: Delete ${filteredTasks.length} tasks PERMANENTLY?`)) {
                return;
            }

            setLoading(true);
            try {
                let deletedCount = 0;
                // Delete in batches or mapping promises (Firestore batch is limited to 500 ops)
                // For simplicity/safety in UI loop:
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

    useEffect(() => {
        const q = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('FETCHED TASKS:', tasksData.length, tasksData);
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            alert("Failed to fetch tasks: " + error.message);
            setLoading(false);
        });

        return unsubscribe;
    }, []);



    // Fetch user team
    useEffect(() => {
        const fetchUserTeam = async () => {
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        setUserTeam(userDoc.data().team);
                    }
                } catch (error) {
                    console.error("Error fetching user team:", error);
                }
            }
        };
        fetchUserTeam();

        // Fetch all editors (case-insensitive)
        const q = query(collection(db, 'users'), where('role', 'in', ['Editor', 'editor']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const editors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllEditors(editors);
        });

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        console.log('FILTERING START:', {
            tasksCount: tasks.length,
            userRole: userRole || 'MISSING',
            userTeam: userTeam || 'NONE',
            userId: currentUser?.uid
        });
        if (!currentUser) return console.log('FILTERING ABORT: No currentUser');
        // DON'T ABORT if no userRole, just default to basic view

        let filtered = tasks.filter(task => {
            // Client-side Completed filter
            // Editor section should only show active work: Pending, Assigned, In_Review
            // Completed tasks go to Task History
            if (task.status === 'Completed') return false;

            // NEW VERDICT: Show all active tasks to everyone (Admins and Editors)
            // This ensures tasks created by anyone are visible to the entire team.
            return true;
        });
        console.log('FILTERED TASKS COUNT:', filtered.length);

        // Filter by editor
        if (filters.editor !== 'all') {
            filtered = filtered.filter(task => task.editor_id === filters.editor);
        }

        // Filter by programme
        if (filters.programme !== 'all') {
            filtered = filtered.filter(task => task.program === filters.programme);
        }

        // Filter by brand
        if (filters.brand !== 'all') {
            filtered = filtered.filter(task => task.brand === filters.brand);
        }

        // Filter by client (Manager)
        if (filters.client !== 'all') {
            filtered = filtered.filter(task => task.client === filters.client);
        }

        // Filter by assigned team
        if (filters.team !== 'all') {
            filtered = filtered.filter(task => task.assigned_team === filters.team);
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

        // Prioritize: 1. Action Required (Pending/Assigned) > In_Review, 2. Oldest Due Date First
        filtered.sort((a, b) => {
            // Priority 1: Status (Action needed comes first)
            const statusPriority = (status) => {
                if (status === 'Pending' || status === 'Assigned') return 0; // High priority (Needs action)
                if (status === 'In_Review') return 1; // Lower priority (Action taken)
                return 2;
            };
            const priorityA = statusPriority(a.status);
            const priorityB = statusPriority(b.status);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // Priority 2: Due Date Ascending (Past dates first - "Overdue" attention)
            const dateA = a.due_date ? a.due_date.toDate() : new Date(8640000000000000); // Far future if null
            const dateB = b.due_date ? b.due_date.toDate() : new Date(8640000000000000);
            return dateA - dateB; // Ascending
        });

        setFilteredTasks(filtered);

        // Calculate programme stats from FILTERED tasks
        // This ensures the "Tasks by Programme" section rearranges/filters based on current selection
        const programmeSummary = {};
        filtered.forEach(task => {
            if (task.program) {
                if (!programmeSummary[task.program]) {
                    programmeSummary[task.program] = { total: 0, claimed: 0 };
                }
                programmeSummary[task.program].total += 1;
                if (task.status === 'Assigned' || task.status === 'In_Review') {
                    programmeSummary[task.program].claimed += 1;
                }
            }
        });
        const stats = Object.keys(programmeSummary).map(key => ({
            name: key,
            tasks: programmeSummary[key].total,
            claimed: programmeSummary[key].claimed
        }));
        // Sort stats by count descending
        stats.sort((a, b) => b.tasks - a.tasks);
        setProgrammeStats(stats);

        // Calculate editor stats
        const editorAssignments = {};
        const editorUrlCounts = {};

        // Initialize for all known editors to ensure 0s are shown
        allEditors.forEach(e => {
            editorAssignments[e.id] = 0;
            editorUrlCounts[e.id] = 0;
        });

        tasks.forEach(task => {
            const isClaimed = task.status === 'Assigned' || task.status === 'In_Review';
            if (task.editor_id && isClaimed) {
                editorAssignments[task.editor_id] = (editorAssignments[task.editor_id] || 0) + 1;

                // Calculate remaining URLs for this task
                const platforms = Array.isArray(task.platform) ? task.platform : [];
                const taskCount = parseInt(task.task_count) || 1;

                let remainingUrlsInTask = 0;
                platforms.forEach(p => {
                    const platformKey = p.toLowerCase();
                    const savedLinks = task.editor_links?.[platformKey];
                    const savedLinksArray = Array.isArray(savedLinks) ? savedLinks : (savedLinks ? [savedLinks] : []);
                    const nonEmptyCount = savedLinksArray.filter(link => link && link.trim()).length;
                    remainingUrlsInTask += Math.max(0, taskCount - nonEmptyCount);
                });

                editorUrlCounts[task.editor_id] = (editorUrlCounts[task.editor_id] || 0) + remainingUrlsInTask;
            }
        });

        const eStats = allEditors.map(editor => ({
            id: editor.id,
            name: editor.name || editor.displayName || editor.email.split('@')[0],
            email: editor.email,
            count: editorAssignments[editor.id] || 0,
            urlCount: editorUrlCounts[editor.id] || 0
        }));
        setEditorStats(eStats);
    }, [tasks, filters, userTeam, currentUser?.uid, userRole, allEditors]);

    const handleClearFilters = () => {
        setFilters({
            editor: 'all',
            programme: 'all',
            brand: 'all',
            client: 'all',
            team: 'all',
            startDate: '',
            endDate: ''
        });
        setSearchFilters({
            editor: '',
            programme: '',
            brand: '',
            client: '',
            team: ''
        });
    };

    const handleClaim = async (taskId) => {
        if (userRole?.toLowerCase() !== 'editor') {
            alert("Only Editors can claim tickets.");
            return;
        }
        try {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== 'Pending') {
                alert("This ticket has already been claimed by another editor.");
                return;
            }

            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, {
                editor_id: currentUser.uid,
                status: 'Assigned'
            });
        } catch (error) {
            console.error("Error claiming task:", error);
        }
    };

    const handleMarkDone = async (taskId) => {
        if (userRole?.toLowerCase() !== 'editor') {
            alert("Only Editors can complete tasks.");
            return;
        }
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Only allow the original claimant to mark as done
            if (task.editor_id !== currentUser.uid) {
                alert("Only the editor who claimed this ticket can mark it as Done.");
                return;
            }

            // 1. Validate completeness (Array-aware)
            const missingLinks = [];
            const platforms = ['youtube', 'facebook', 'tiktok'];
            const taskCount = task.task_count || 1;

            for (const p of platforms) {
                const isRequired = task.platform?.some(tp => tp.toLowerCase() === p);
                if (!isRequired) continue;

                const urls = task.editor_links?.[p];
                const urlsArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);
                const validUrls = urlsArray.filter(u => u && u.trim() && validatePlatformUrl(u, p));

                if (validUrls.length < taskCount) {
                    missingLinks.push(p.charAt(0).toUpperCase() + p.slice(1));
                }
            }

            if (missingLinks.length > 0) {
                alert(`Cannot complete task! Please submit ALL required valid links first (${taskCount} per platform): ${missingLinks.join(', ')}`);
                return;
            }

            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, {
                status: 'Completed',
                completed_at: serverTimestamp()
            });
        } catch (error) {
            console.error("Error marking task done:", error);
            alert("Failed to mark task as Done. Please try again.");
        }
    };
    const openLinkModal = (task) => {
        setSelectedTask(task);
        const count = task.task_count || 1;
        const initLinks = {
            youtube: '',
            facebook: '',
            tiktok: ''
        };

        if (task.editor_links) {
            ['youtube', 'facebook', 'tiktok'].forEach(p => {
                const val = task.editor_links[p];
                if (Array.isArray(val)) {
                    // Convert array to newline-separated string
                    initLinks[p] = val.filter(v => v && v.trim()).join('\n');
                } else if (val) {
                    initLinks[p] = val; // Backward compatibility
                } else {
                    initLinks[p] = '';
                }
            });
        }
        setLinks(initLinks);
        setValidationSummaries({ youtube: null, facebook: null, tiktok: null });
    };

    // Validate Platform URL
    const validatePlatformUrl = (url, platform) => {
        if (!url) return true;
        const lowerUrl = url.toLowerCase();

        if (platform === 'youtube') {
            return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
        }
        if (platform === 'facebook') {
            return lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch');
        }
        if (platform === 'tiktok') {
            return lowerUrl.includes('tiktok.com');
        }
        return true;
    };
    const isTaskFulfillment = (task) => {
        if (!task) return false;
        const platforms = ['youtube', 'facebook', 'tiktok'];
        const taskCount = task.task_count || 1;

        for (const p of platforms) {
            const isRequired = task.platform?.some(tp => tp.toLowerCase() === p);
            if (!isRequired) continue;

            const urls = task.editor_links?.[p];
            const urlsArray = Array.isArray(urls) ? urls : (urls ? [urls] : []);

            if (urlsArray.length < taskCount || urlsArray.some(u => !u || !u.trim() || !validatePlatformUrl(u, p))) {
                return false;
            }
        }
        return true;
    };

    // Helper to normalize YouTube URLs to long format for comparison
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

    // Check if link is unique for the brand
    const checkLinkUniqueness = (link, platform, currentTask = null, currentLinksState = null) => {
        if (!link) return true;

        // Normalize the link for comparison
        const normalizedLink = getYouTubeLongUrl(link).toLowerCase().trim();
        const currentTaskId = currentTask?.id;
        const currBrand = (currentTask?.brand || '').toLowerCase().trim();

        // 1. Check against other tasks in database
        for (const t of tasks) {
            if (t.id === currentTaskId || !t.editor_links) continue;

            const tBrand = (t.brand || '').toLowerCase().trim();

            // Check all platforms in this other task
            const linkFoundInTask = Object.values(t.editor_links).flat().some(l => {
                if (!l || typeof l !== 'string') return false;
                return getYouTubeLongUrl(l).toLowerCase().trim() === normalizedLink;
            });

            if (linkFoundInTask) {
                // NEW LOGIC: Allow duplicate if it's a DIFFERENT brand
                if (tBrand !== currBrand || currBrand === "") {
                    continue; // Skip this task, different brand is allowed
                }

                // If same brand, it's a blocking duplicate
                return { blockingTask: t };
            }
        }

        // 2. Check against current state (intra-ticket uniqueness)
        if (currentLinksState) {
            // If currentLinksState is a string (textarea), parse it first
            const urlsToCheck = typeof currentLinksState === 'string'
                ? parseUrls(currentLinksState)
                : Object.values(currentLinksState).flat();

            let occurrences = 0;
            urlsToCheck.forEach(l => {
                if (!l || typeof l !== 'string') return;
                if (getYouTubeLongUrl(l).toLowerCase().trim() === normalizedLink) occurrences++;
            });
            if (occurrences > 1) return { intraTicket: true };
        }

        return true; // Valid
    };

    const handleSavePlatformLinks = async (platform) => {
        if (!selectedTask) return;
        const text = links[platform];
        const results = validateBulk(platform, text, selectedTask, true); // Pass isSave=true

        setValidationSummaries(prev => ({ ...prev, [platform]: results }));

        if (results.invalid > 0 || results.duplicates > 0) {
            alert(`Cannot save ${platform} links! Please fix errors first.`);
            return;
        }

        try {
            const fetchViews = async (url) => {
                if (!url) return 0;
                try {
                    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                    if (isYouTube) {
                        const longUrl = getYouTubeLongUrl(url);
                        const apiUrl = `https://us-central1-sheetbot-475711.cloudfunctions.net/get_youtube_views?url=${encodeURIComponent(longUrl)}`;
                        const response = await fetch(apiUrl);
                        const data = await response.json();
                        return data.views || data.view_count || 0;
                    } else {
                        const apiUrl = `https://video-api-801394283865.us-central1.run.app/views?url=${encodeURIComponent(url)}`;
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
                        const response = await fetch(proxyUrl);
                        const data = await response.json();
                        return data.view_count || 0;
                    }
                } catch (err) {
                    console.error("Error fetching views:", err);
                    return 0;
                }
            };

            const viewCounts = await Promise.all(results.validUrls.map(u => fetchViews(u)));

            const taskRef = doc(db, 'tasks', selectedTask.id);
            const currentData = (await getDoc(taskRef)).data();

            const updatedLinks = { ...(currentData.editor_links || {}), [platform]: results.validUrls };
            const updatedViews = { ...(currentData.view_counts || {}), [platform]: viewCounts };

            await updateDoc(taskRef, {
                editor_links: updatedLinks,
                view_counts: updatedViews
            });

            alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} links saved successfully!`);
        } catch (error) {
            console.error("Error saving links:", error);
            alert("Failed to save links. Please try again.");
        }
    };

    // Parse text into clean URL array
    const parseUrls = (text) => {
        if (!text || typeof text !== 'string') return [];
        return text
            .split(/[\n,]/)
            .map(u => u.trim())
            .filter(u => u.length > 0);
    };

    // Bulk Validation Helper
    const validateBulk = (platform, text, task, isSave = false) => {
        const urls = parseUrls(text);
        const results = {
            total: urls.length,
            valid: 0,
            invalid: 0,
            duplicates: 0,
            errors: [],
            validUrls: []
        };

        const validUrls = [];
        const localSeen = new Set();
        const taskCount = task?.task_count || 1;

        if (!isSave && urls.length !== taskCount) {
            results.errors.push(`Requirement: Exactly ${taskCount} URLs are needed. Detected: ${urls.length}`);
            results.invalid = results.total;
            return results;
        }

        if (isSave && urls.length > taskCount) {
            results.errors.push(`Requirement: Maximum ${taskCount} URLs allowed. Detected: ${urls.length}`);
            results.invalid = results.total;
            return results;
        }

        urls.forEach(url => {
            // 1. Platform Match
            if (!validatePlatformUrl(url, platform)) {
                results.invalid++;
                results.errors.push(`Invalid ${platform} URL: ${url}`);
                return;
            }

            // 2. Local Duplicate Detection
            const normalized = getYouTubeLongUrl(url).toLowerCase().trim();
            if (localSeen.has(normalized)) {
                results.duplicates++;
                results.errors.push(`Local duplicate: ${url}`);
                return;
            }
            localSeen.add(normalized);

            // 3. Global Duplicate Detection (Same Brand)
            const uniqueness = checkLinkUniqueness(url, platform, task);
            if (uniqueness !== true) {
                results.duplicates++;
                if (uniqueness.intraTicket) {
                    results.errors.push(`Duplicate in ticket: ${url}`);
                } else {
                    results.errors.push(`Used in "${uniqueness.blockingTask.brand}": ${url}`);
                }
                return;
            }

            results.valid++;
            results.validUrls.push(url);
        });

        return results;
    };

    const submitLinks = async (e) => {
        e.preventDefault();
        if (userRole?.toLowerCase() !== 'editor') {
            alert("Only Editors can submit links.");
            return;
        }
        if (!selectedTask) return;

        // Validation for all required platforms
        const platforms = ['youtube', 'facebook', 'tiktok'];
        const allResults = {};
        let totalValidUrls = 0;
        const taskCount = selectedTask.task_count || 1;

        for (const p of platforms) {
            const isRequired = selectedTask.platform?.some(tp => tp.toLowerCase() === p);
            if (!isRequired) continue;

            const text = links[p] || '';
            const results = validateBulk(p, text, selectedTask);
            allResults[p] = results;

            if (results.invalid > 0 || results.duplicates > 0) {
                setValidationSummaries(prev => ({ ...prev, [p]: results }));
                alert(`Please fix errors in ${p} before submitting.`);
                return;
            }

            if (results.valid < taskCount) {
                alert(`Please provide at least ${taskCount} URLs for ${p}.`);
                return;
            }

            totalValidUrls += results.valid;
        }

        if (totalValidUrls === 0) {
            alert("Please enter at least one URL.");
            return;
        }

        try {
            // Helper to fetch views (re-using the logic from handleSavePlatformLinks)
            const fetchViews = async (url) => {
                if (!url) return 0;
                try {
                    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                    if (isYouTube) {
                        const longUrl = getYouTubeLongUrl(url);
                        const apiUrl = `https://us-central1-sheetbot-475711.cloudfunctions.net/get_youtube_views?url=${encodeURIComponent(longUrl)}`;
                        const response = await fetch(apiUrl);
                        const data = await response.json();
                        return data.views || data.view_count || 0;
                    } else {
                        const apiUrl = `https://video-api-801394283865.us-central1.run.app/views?url=${encodeURIComponent(url)}`;
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
                        const response = await fetch(proxyUrl);
                        const data = await response.json();
                        return data.view_count || 0;
                    }
                } catch (err) {
                    console.error("Error fetching views:", err);
                    return 0;
                }
            };

            const finalLinks = {};
            const finalViews = {};

            for (const p of Object.keys(allResults)) {
                const results = allResults[p];
                finalLinks[p] = results.validUrls;
                finalViews[p] = await Promise.all(results.validUrls.map(u => fetchViews(u)));
            }

            const taskRef = doc(db, 'tasks', selectedTask.id);
            await updateDoc(taskRef, {
                editor_links: finalLinks,
                view_counts: finalViews,
                status: 'In_Review'
            });

            alert('Links submitted successfully!');
            setSelectedTask(null);
            setLinks({ youtube: '', facebook: '', tiktok: '' });
        } catch (error) {
            console.error("Error submitting links:", error);
            alert("Failed to submit links. Please try again.");
        }
    };

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkProgram, setBulkProgram] = useState('');
    const [bulkRowData, setBulkRowData] = useState({}); // { taskId: { youtube: '', facebook: '', tiktok: '' } }
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    // Get unique programs for the selected date
    const availablePrograms = [...new Set(tasks.filter(t => {
        if (t.editor_id !== currentUser.uid) return false;
        if (!t.due_date) return false;
        const taskDate = t.due_date.toDate().toISOString().split('T')[0];
        return taskDate === bulkDate;
    }).map(t => t.program))];

    // Get tasks for the selected date and program
    const bulkTasks = tasks.filter(t => {
        if (t.editor_id !== currentUser.uid) return false;
        if (t.status === 'Completed') return false;
        if (t.program !== bulkProgram) return false;
        if (!t.due_date) return false;
        const taskDate = t.due_date.toDate().toISOString().split('T')[0];
        return taskDate === bulkDate;
    });

    const handleBulkLinkChange = (taskId, platform, index, value) => {
        setBulkRowData(prev => {
            const taskData = prev[taskId] || { youtube: [], facebook: [], tiktok: [] };
            const platformLinks = [...(taskData[platform] || [])];
            platformLinks[index] = value;
            return {
                ...prev,
                [taskId]: {
                    ...taskData,
                    [platform]: platformLinks
                }
            };
        });
    };

    const handleBulkSubmit = async (e) => {
        console.log('SCHEDULER SUBMIT:', {
            uid: currentUser?.uid,
            role: userRole,
            email: currentUser?.email
        });
        e.preventDefault();
        setBulkSubmitting(true);

        try {
            let processedCount = 0;
            let errorFound = false;

            // Helper to fetch views (reused)
            const fetchViews = async (url) => {
                if (!url) return 0;
                try {
                    // Check if it's a YouTube URL
                    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

                    if (isYouTube) {
                        const longUrl = getYouTubeLongUrl(url);

                        const apiUrl = `https://us-central1-sheetbot-475711.cloudfunctions.net/get_youtube_views?url=${encodeURIComponent(longUrl)}`;

                        const response = await fetch(apiUrl);

                        const text = await response.text();

                        // Try to parse as JSON first
                        let viewCount = 0;
                        try {
                            const data = JSON.parse(text);
                            viewCount = parseInt(data.view_count || data.views || 0);
                        } catch (e) {
                            // If not JSON, try to parse as number
                            viewCount = parseInt(text) || 0;
                        }

                        return viewCount;
                    } else {
                        // Use old API for TikTok/Facebook
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

            for (const task of bulkTasks) {
                const links = bulkRowData[task.id];
                if (!links) continue;

                const taskCount = task.task_count || 1;
                const platforms = ['youtube', 'facebook', 'tiktok'];
                let taskError = null;

                // 1. Check Completeness & Validity
                for (const p of platforms) {
                    const isRequired = task.platform?.some(tp => tp.toLowerCase() === p);
                    if (!isRequired) continue;

                    const urls = links[p] || [];
                    if (urls.length < taskCount || urls.some(u => !u.trim())) {
                        taskError = `${task.brand}: Please provide all ${taskCount} ${p} links.`;
                        break;
                    }

                    for (const url of urls) {
                        if (!validatePlatformUrl(url, p)) {
                            taskError = `${task.brand}: Invalid ${p} URL!`;
                            break;
                        }
                        const uniqueness = checkLinkUniqueness(url, p, task);
                        if (uniqueness !== true) {
                            taskError = `${task.brand}: Link ${url} is already used in another task for the brand "${uniqueness.blockingTask.brand}". Same links can only be used across different brands.`;
                            break;
                        }
                    }
                    if (taskError) break;
                }

                if (taskError) {
                    alert(taskError);
                    errorFound = true;
                    break;
                }

                // 2. Fetch View Counts for all links
                const viewCounts = { youtube: [], facebook: [], tiktok: [] };
                for (const p of platforms) {
                    const urls = links[p] || [];
                    viewCounts[p] = await Promise.all(urls.map(u => fetchViews(u)));
                }

                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, {
                    editor_links: links,
                    view_counts: viewCounts,
                    status: 'In_Review'
                });
                processedCount++;
            }

            if (errorFound) {
                setBulkSubmitting(false);
                return;
            }

            if (processedCount > 0) {
                alert(`Successfully updated ${processedCount} tasks!`);
                setShowBulkModal(false);
                setBulkRowData({});
            } else {
                alert("No links were entered.");
            }
        } catch (error) {
            console.error("Error in bulk submit:", error);
            alert("Failed to submit bulk links. Please try again.");
        } finally {
            setBulkSubmitting(false);
        }
    };


    if (loading) return <div className="p-8 text-center text-slate-500">Loading tasks...</div>;

    return (
        <div className="animate-fadeIn pb-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gradient">
                        Total Tasks ({filteredTasks.length})
                    </h1>
                    <p className="text-slate-600 font-medium mt-1">Manage and track your assigned work</p>
                </div>
                {userRole?.toLowerCase() === 'admin' && (
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Layers size={18} />
                        Bulk Submit
                    </button>
                )}
            </div>

            {/* Programme Task Count Panels */}
            {programmeStats.length > 0 && (
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Layers size={20} className="text-indigo-600" />
                        Tasks by Programme
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"> {/* More compact grid */}
                        {programmeStats.map((prog, index) => (
                            <button
                                key={prog.name}
                                onClick={() => setFilters({ ...filters, programme: prog.name })}
                                className={clsx(
                                    "p-2 rounded-lg transition-all transform hover:scale-105 active:scale-95 text-left flex flex-col justify-between min-h-[60px]", // Compact padding and height
                                    filters.programme === prog.name
                                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md scale-105 ring-2 ring-indigo-200"
                                        : "bg-white/60 backdrop-blur-sm border border-slate-200 hover:border-indigo-300 text-slate-700 hover:bg-white"
                                )}
                            >
                                <div className="font-bold text-xs mb-0.5 truncate w-full" title={prog.name}>
                                    {prog.name}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className={clsx(
                                        "text-lg font-bold leading-none",
                                        filters.programme === prog.name ? "text-white" : "text-indigo-600"
                                    )}>
                                        {prog.tasks}
                                    </div>
                                    <div className={clsx(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        filters.programme === prog.name ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                                    )}>
                                        Claimed: {prog.claimed}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* My Tasks (Editor Stats) Section */}
            {editorStats.length > 0 && (
                <div className="card-glass p-6 rounded-2xl shadow-premium animate-slideUp mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <User size={20} className="text-indigo-600" />
                        My Tasks (Claimed by Editor)
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {editorStats.map((editor) => {
                            const isCurrentUser = editor.id === currentUser?.uid;
                            return (
                                <button
                                    key={editor.id}
                                    onClick={() => setFilters(prev => ({ ...prev, editor: prev.editor === editor.id ? 'all' : editor.id }))}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl transition-all border-2 flex flex-col items-center gap-1 min-w-[120px] relative",
                                        filters.editor === editor.id
                                            ? "gradient-primary text-white border-transparent shadow-lg scale-105 z-10"
                                            : isCurrentUser
                                                ? "bg-indigo-600 text-white border-indigo-700 shadow-md ring-4 ring-indigo-500/20"
                                                : "bg-white/60 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-white"
                                    )}
                                >
                                    <span className={clsx(
                                        "text-[10px] font-black uppercase tracking-wider truncate w-24 text-center",
                                        filters.editor === editor.id ? "text-white" :
                                            isCurrentUser ? "text-indigo-100" : ""
                                    )}>
                                        {isCurrentUser ? 'Me' : editor.name}
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black">{editor.count}</span>
                                        <span className={clsx(
                                            "text-[10px] font-bold opacity-70",
                                            filters.editor === editor.id ? "text-white/80" :
                                                isCurrentUser && filters.editor !== editor.id ? "text-indigo-100" : ""
                                        )}>Claimed Tickets</span>
                                    </div>
                                    <div className={clsx(
                                        "text-xs font-black mt-[-4px]",
                                        filters.editor === editor.id ? "text-white/90" :
                                            isCurrentUser && filters.editor !== editor.id ? "text-indigo-200" : "text-slate-500"
                                    )}>
                                        {editor.urlCount} Remaining URL
                                    </div>
                                    {isCurrentUser && filters.editor !== editor.id && (
                                        <div className="absolute -top-2 -right-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                            OWNER
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    userRole?.toLowerCase() === 'admin' ? "md:grid-cols-8" : "md:grid-cols-7"
                )}>
                    {/* Editor Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Editor</label>
                        <input
                            type="text"
                            placeholder="Search Editor..."
                            className="w-full px-3 py-1 mb-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchFilters.editor}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, editor: e.target.value }))}
                        />
                        <select
                            value={filters.editor}
                            onChange={(e) => setFilters({ ...filters, editor: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Editors</option>
                            {allEditors
                                .filter(e => (e.name || e.email || '').toLowerCase().includes(searchFilters.editor.toLowerCase()))
                                .map(editor => (
                                    <option key={editor.id} value={editor.id}>{editor.name || editor.email}</option>
                                ))}
                        </select>
                    </div>

                    {/* Programme Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Programme</label>
                        <input
                            type="text"
                            placeholder="Search Programme..."
                            className="w-full px-3 py-1 mb-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchFilters.programme}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, programme: e.target.value }))}
                        />
                        <select
                            value={filters.programme}
                            onChange={(e) => setFilters({ ...filters, programme: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Programmes</option>
                            {[...new Set(tasks.map(t => t.program).filter(Boolean))]
                                .filter(p => p.toLowerCase().includes(searchFilters.programme.toLowerCase()))
                                .map(programme => (
                                    <option key={programme} value={programme}>{programme}</option>
                                ))}
                        </select>
                    </div>

                    {/* Brand Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Brand</label>
                        <input
                            type="text"
                            placeholder="Search Brand..."
                            className="w-full px-3 py-1 mb-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchFilters.brand}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, brand: e.target.value }))}
                        />
                        <select
                            value={filters.brand}
                            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Brands</option>
                            {[...new Set(tasks.map(t => t.brand).filter(Boolean))]
                                .filter(b => b.toLowerCase().includes(searchFilters.brand.toLowerCase()))
                                .map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                        </select>
                    </div>

                    {/* Manager (Client) Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Client</label>
                        <input
                            type="text"
                            placeholder="Search Client..."
                            className="w-full px-3 py-1 mb-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchFilters.client}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, client: e.target.value }))}
                        />
                        <select
                            value={filters.client}
                            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Clients</option>
                            {[...new Set(tasks.map(t => t.client).filter(Boolean))]
                                .filter(c => c.toLowerCase().includes(searchFilters.client.toLowerCase()))
                                .map(client => (
                                    <option key={client} value={client}>{client}</option>
                                ))}
                        </select>
                    </div>

                    {/* Team Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Team</label>
                        <input
                            type="text"
                            placeholder="Search Team..."
                            className="w-full px-3 py-1 mb-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchFilters.team}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, team: e.target.value }))}
                        />
                        <select
                            value={filters.team}
                            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Teams</option>
                            {['News', 'Teledrama']
                                .filter(t => t.toLowerCase().includes(searchFilters.team.toLowerCase()))
                                .map(team => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                        </select>
                    </div>

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

                    {/* Delete Button (Admin Only) */}
                    {userRole?.toLowerCase() === 'admin' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Actions</label>
                            <button
                                onClick={handleBulkDelete}
                                className="w-full px-3 py-2 bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-200 hover:border-red-300 font-bold transition-colors flex items-center justify-center gap-2"
                                title="Delete filtered tasks"
                            >
                                <Trash2 size={16} />
                                Delete ({filteredTasks.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {filteredTasks.length === 0 && (
                    <div className="col-span-full py-20 text-center card-glass rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="text-slate-400 mb-2">
                            <CheckCircle size={48} className="mx-auto opacity-20 mb-4" />
                            <p className="text-xl font-bold">No tasks found</p>
                            <p className="text-sm">You have no tasks assigned or available to claim at the moment.</p>
                            <p className="text-xs mt-4 opacity-50">Logged in as: {userRole} ({currentUser?.email})</p>
                        </div>
                    </div>
                )}
                {filteredTasks.map((task, index) => (
                    <div key={task.id} className="card-glass p-3 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] flex flex-col animate-slideUp relative group" style={{ animationDelay: `${index * 0.05}s` }}>

                        {userRole?.toLowerCase() === 'admin' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                }}
                                className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 rounded-full p-1 shadow-sm transition-all z-10 opacity-0 group-hover:opacity-100"
                                title="Delete Ticket"
                            >
                                <X size={14} />
                            </button>
                        )}

                        {/* Status & Date Header */}
                        <div className="flex flex-col gap-1 mb-2">
                            <div className="flex justify-between items-center">
                                <span className={clsx(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                                    task.status === 'Pending' ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                                        task.status === 'Assigned' ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                            task.status === 'In_Review' ? "bg-purple-100 text-purple-700 border border-purple-200" :
                                                "bg-green-100 text-green-700 border border-green-200"
                                )}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                <span className={clsx(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                    (task.due_date?.toDate() < new Date()) && task.status !== 'Completed'
                                        ? "bg-red-50 text-red-600 border-red-100"
                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                )}>
                                    Due: {task.due_date?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </span>
                            </div>
                            {task.created_at && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                    Arranged: {task.created_at.toDate().toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                    {task.client && (
                                        <div className="text-[10px] text-indigo-500 font-bold mt-0.5 block">
                                            Client: {task.client}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Title & Program */}
                                <h3 className="font-bold text-sm text-slate-800 leading-tight mb-0.5 truncate" title={task.brand}>
                                    {task.brand}
                                </h3>
                                <p className="text-[10px] text-indigo-600 font-bold mb-2 truncate">{task.program}</p>

                                {/* Description */}
                                <p className="text-slate-500 text-[10px] mb-3 flex-1 line-clamp-3 leading-snug min-h-[3em]">
                                    {task.description}
                                </p>
                            </div>

                            {/* Link Count Summary */}
                            <div className="flex flex-col gap-1.5 p-2 bg-white/50 border border-slate-200 rounded-lg min-w-[32px] items-center justify-center shadow-sm">
                                {task.platform?.map(platform => {
                                    const initial = platform.charAt(0).toUpperCase();
                                    const count = task.task_count || 1;
                                    return (
                                        <div key={platform} className="text-[10px] font-bold text-slate-700 flex flex-col items-center">
                                            <span className={clsx(
                                                "w-4 h-4 rounded flex items-center justify-center text-[8px] mb-0.5",
                                                platform.toLowerCase().includes('facebook') ? "bg-blue-100 text-blue-600" :
                                                    platform.toLowerCase().includes('youtube') ? "bg-red-100 text-red-600" :
                                                        "bg-slate-200 text-slate-700"
                                            )}>
                                                {initial}
                                            </span>
                                            <span className="leading-none">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Link Indicators (Compact & Scrollable) */}
                        <div className="flex gap-1 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                            {task.platform?.map(p => {
                                const platformKey = p.toLowerCase();
                                const linksArray = task.editor_links?.[platformKey];
                                const taskCount = task.task_count || 1;

                                return Array.from({ length: taskCount }).map((_, idx) => {
                                    const link = Array.isArray(linksArray) ? linksArray[idx] : (idx === 0 ? linksArray : null);
                                    const isValid = link && validatePlatformUrl(link, platformKey);

                                    return (
                                        <span key={`${p}-${idx}`} className={clsx(
                                            "w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-[8px] font-bold border transition-all duration-200",
                                            isValid
                                                ? "bg-green-600 text-white border-green-700 shadow-sm"
                                                : (platformKey.includes('facebook') ? "border-blue-200 text-blue-600 bg-blue-50" :
                                                    platformKey.includes('youtube') ? "border-red-200 text-red-600 bg-red-50" :
                                                        "border-slate-200 text-slate-600 bg-slate-50")
                                        )}>
                                            {p.charAt(0).toUpperCase()}
                                        </span>
                                    );
                                });
                            })}
                        </div>

                        {/* Actions (Only for Editors, hide for Schedulers) */}
                        {userRole?.toLowerCase() === 'editor' && (
                            <div className="mt-auto pt-2 border-t border-slate-100">
                                {task.status === 'Pending' ? (
                                    <button
                                        onClick={() => handleClaim(task.id)}
                                        className="w-full py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        Claim
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => openLinkModal(task)}
                                            className="py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink size={12} />
                                            Links
                                        </button>
                                        <button
                                            onClick={() => handleMarkDone(task.id)}
                                            disabled={(task.status !== 'In_Review' && !isTaskFulfillment(task)) || (task.editor_id !== currentUser.uid)}
                                            className={clsx(
                                                "py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
                                                (task.status === 'In_Review' || isTaskFulfillment(task)) && task.editor_id === currentUser.uid
                                                    ? "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            )}
                                            title={
                                                task.editor_id !== currentUser.uid
                                                    ? "Only the claimant can mark as Done"
                                                    : (task.status === 'In_Review' || isTaskFulfillment(task))
                                                        ? "Mark as Completed"
                                                        : "Submit links first to mark as Done"
                                            }
                                        >
                                            <CheckCircle size={12} />
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* View Only Indicator for Schedulers/Admins when viewing other's tasks */}
                        {userRole?.toLowerCase() !== 'editor' && (
                            <div className="mt-auto pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center italic font-medium">
                                View Only Mode
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Link Submission Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="card-glass p-8 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-slideUp">
                        <div className="mb-8 text-center">
                            <h3 className="text-2xl font-bold text-gradient">Submit Social Media Links</h3>
                            <p className="text-slate-600 font-medium mt-2">Paste the published URLs for <br /><span className="text-indigo-600">{selectedTask.brand} - {selectedTask.program}</span></p>
                        </div>

                        <form onSubmit={submitLinks} className="space-y-6">
                            {['youtube', 'facebook', 'tiktok'].map(platform => {
                                const isRequired = selectedTask.platform?.some(p => p.toLowerCase() === platform);
                                if (!isRequired) return null;

                                const platformInfo = {
                                    youtube: { label: 'YouTube Video', icon: Youtube, color: 'red' },
                                    facebook: { label: 'Facebook Post', icon: Facebook, color: 'blue' },
                                    tiktok: { label: 'TikTok Video', icon: Video, color: 'slate' }
                                }[platform];

                                const Icon = platformInfo.icon;
                                const urlText = links[platform] || '';
                                const summary = validationSummaries[platform];

                                return (
                                    <div key={platform} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <div className={clsx(
                                                    "p-1.5 rounded-lg shadow-sm",
                                                    platform === 'tiktok' ? "bg-slate-900 text-white" : `bg-${platformInfo.color}-100 text-${platformInfo.color}-600`
                                                )}>
                                                    <Icon size={16} />
                                                </div>
                                                {platformInfo.label} URLs (Paste multiple)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleSavePlatformLinks(platform)}
                                                className="px-4 py-1.5 gradient-primary text-white rounded-lg text-xs font-bold hover:shadow-md transition-all transform active:scale-95"
                                            >
                                                SAVE {platform.toUpperCase()}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <textarea
                                                className={clsx(
                                                    "w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl text-xs outline-none transition-all font-medium min-h-[120px] resize-y",
                                                    platform === 'youtube' ? "focus:ring-red-500 focus:border-red-500" :
                                                        platform === 'facebook' ? "focus:ring-blue-500 focus:border-blue-500" :
                                                            "focus:ring-slate-900 focus:border-slate-900"
                                                )}
                                                value={urlText}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setLinks({ ...links, [platform]: val });
                                                }}
                                                onBlur={e => {
                                                    // Auto-formatting: turn whitespace/newlines into commas for the user
                                                    const raw = e.target.value;
                                                    const clean = parseUrls(raw).join(', ');
                                                    if (clean !== raw) {
                                                        setLinks({ ...links, [platform]: clean });
                                                    }
                                                }}
                                                placeholder={`Paste exactly ${selectedTask.task_count || 1} ${platformInfo.label} URLs here (comma separated)`}
                                            />
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-bold",
                                                    parseUrls(urlText).length === (selectedTask.task_count || 1)
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-yellow-100 text-yellow-600"
                                                )}>
                                                    {parseUrls(urlText).length} / {selectedTask.task_count || 1}
                                                </span>
                                            </div>
                                        </div>

                                        {summary && (
                                            <div className={clsx(
                                                "p-3 rounded-xl border text-[10px] space-y-1 transition-all animate-fadeIn",
                                                summary.invalid > 0 || summary.duplicates > 0
                                                    ? "bg-red-50 border-red-100 text-red-700"
                                                    : "bg-green-50 border-green-100 text-green-700"
                                            )}>
                                                <div className="flex justify-between font-bold">
                                                    <span>Total: {summary.total}</span>
                                                    <span>Valid: {summary.valid}</span>
                                                    <span>Invalid: {summary.invalid}</span>
                                                    <span>Duplicates: {summary.duplicates}</span>
                                                </div>
                                                {summary.errors.length > 0 && (
                                                    <div className="pt-1 border-t border-red-100/50 mt-1">
                                                        {summary.errors.slice(0, 3).map((err, i) => (
                                                            <div key={i} className="flex gap-1 items-start">
                                                                <span className="mt-1 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                                                                {err}
                                                            </div>
                                                        ))}
                                                        {summary.errors.length > 3 && <div>and {summary.errors.length - 3} more errors...</div>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="flex gap-4 mt-8 pt-6 border-t border-white/30">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isTaskFulfillment(selectedTask)}
                                    className={clsx(
                                        "flex-1 px-4 py-3 rounded-xl font-bold transition-all transform",
                                        isTaskFulfillment(selectedTask)
                                            ? "gradient-primary text-white hover:shadow-glow hover:scale-105 active:scale-95"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}
                                    title={!isTaskFulfillment(selectedTask) ? "Fill all required links across all platforms to enable submission" : "Submit and Verify"}
                                >
                                    Submit & Verify
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Submission Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="card-glass p-8 rounded-2xl shadow-2xl max-w-4xl w-full transform transition-all animate-slideUp max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-gradient">Bulk Link Submission</h3>
                                <p className="text-slate-600 font-medium mt-2">Submit links for multiple brands at once</p>
                            </div>
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={bulkDate}
                                    onChange={(e) => {
                                        setBulkDate(e.target.value);
                                        setBulkProgram('');
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Program</label>
                                <select
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={bulkProgram}
                                    onChange={(e) => setBulkProgram(e.target.value)}
                                    disabled={availablePrograms.length === 0}
                                >
                                    <option value="">{availablePrograms.length === 0 ? 'No programs found for date' : 'Select Program'}</option>
                                    {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        {bulkProgram && (
                            <form onSubmit={handleBulkSubmit}>
                                <div className="space-y-4 mb-8">
                                    {bulkTasks.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200">
                                            No pending tasks found for this selection.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3">Brand</th>
                                                        <th className="px-4 py-3">YouTube</th>
                                                        <th className="px-4 py-3">Facebook</th>
                                                        <th className="px-4 py-3">TikTok</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {bulkTasks.map(task => (
                                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3 font-bold text-slate-800">
                                                                {task.brand}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {(task.platform?.some(tp => tp.toLowerCase() === 'youtube')) ? (
                                                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                                        {Array.from({ length: task.task_count || 1 }).map((_, idx) => (
                                                                            <input
                                                                                key={idx}
                                                                                type="text"
                                                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-1"
                                                                                placeholder={`YouTube URL ${idx + 1}`}
                                                                                value={bulkRowData[task.id]?.youtube?.[idx] || ''}
                                                                                onChange={(e) => handleBulkLinkChange(task.id, 'youtube', idx, e.target.value)}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-slate-300 text-xs">-</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {(task.platform?.some(tp => tp.toLowerCase() === 'facebook')) ? (
                                                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                                        {Array.from({ length: task.task_count || 1 }).map((_, idx) => (
                                                                            <input
                                                                                key={idx}
                                                                                type="text"
                                                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-1"
                                                                                placeholder={`Facebook URL ${idx + 1}`}
                                                                                value={bulkRowData[task.id]?.facebook?.[idx] || ''}
                                                                                onChange={(e) => handleBulkLinkChange(task.id, 'facebook', idx, e.target.value)}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-slate-300 text-xs">-</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {(task.platform?.some(tp => tp.toLowerCase() === 'tiktok')) ? (
                                                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                                        {Array.from({ length: task.task_count || 1 }).map((_, idx) => (
                                                                            <input
                                                                                key={idx}
                                                                                type="text"
                                                                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all mb-1"
                                                                                placeholder={`TikTok URL ${idx + 1}`}
                                                                                value={bulkRowData[task.id]?.tiktok?.[idx] || ''}
                                                                                onChange={(e) => handleBulkLinkChange(task.id, 'tiktok', idx, e.target.value)}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-slate-300 text-xs">-</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-white/30">
                                    <button
                                        type="button"
                                        onClick={() => setShowBulkModal(false)}
                                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={bulkSubmitting || bulkTasks.length === 0}
                                        className="flex-1 px-4 py-3 gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {bulkSubmitting ? 'Submitting...' : 'Submit All Links'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
