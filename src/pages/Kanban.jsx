import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, Tag, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

function TaskCard({ task, isDragging, users }) {
    // Disabled for everyone
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, disabled: true });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const statusColors = {
        Pending: 'border-l-4 border-l-yellow-500',
        Assigned: 'border-l-4 border-l-blue-500',
        In_Review: 'border-l-4 border-l-purple-500',
        Completed: 'border-l-4 border-l-green-500',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-sm hover:shadow-premium transition-all group",
                statusColors[task.status] || 'border-l-4 border-l-slate-200'
            )}
            {...attributes}
        // Listeners removed/disabled
        >
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-800 flex-1 group-hover:text-indigo-600 transition-colors">{task.program}</h3>
                {/* Grip icon removed for everyone */}
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <Tag size={14} className="text-indigo-500" />
                    <span>{task.brand}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    {task.due_date && (
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            <span>
                                {task.due_date?.toDate ? task.due_date.toDate().toLocaleDateString() : new Date(task.due_date).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {task.editor_id && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            <User size={14} className="text-slate-400" />
                            <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs">
                                {users[task.editor_id] || 'Unknown'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Column({ title, tasks, status, color, users }) {
    return (
        <div className="flex-1 min-w-[300px] flex flex-col h-full">
            <div className={clsx("p-4 rounded-t-2xl shadow-lg mb-2 flex items-center justify-between backdrop-blur-md", color)}>
                <h2 className="font-bold text-white text-lg tracking-wide">
                    {title}
                </h2>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-white shadow-inner">
                    {tasks.length}
                </span>
            </div>

            <div className="card-glass p-4 rounded-b-2xl min-h-[600px] space-y-3 flex-1">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} users={users} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="font-medium">No tasks</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Kanban() {
    // No role check needed anymore for read-only View
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState({});
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

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
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersMap = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                usersMap[doc.id] = data.name || 'Unknown';
            });
            setUsers(usersMap);
        });
        return unsubscribe;
    }, []);

    const columns = {
        Pending: { title: 'Pending', color: 'bg-gradient-to-r from-yellow-400 to-orange-500', tasks: tasks.filter(t => t.status === 'Pending') },
        Assigned: { title: 'Assigned', color: 'bg-gradient-to-r from-blue-400 to-indigo-500', tasks: tasks.filter(t => t.status === 'Assigned') },
        In_Review: { title: 'In Review', color: 'bg-gradient-to-r from-purple-400 to-pink-500', tasks: tasks.filter(t => t.status === 'In_Review') },
        Completed: { title: 'Completed', color: 'bg-gradient-to-r from-green-400 to-emerald-500', tasks: tasks.filter(t => t.status === 'Completed') },
    };

    // Disabled handlers
    const handleDragStart = (event) => {
        // Disabled
    };

    const handleDragEnd = async (event) => {
        // Disabled
    };

    const handleDragOver = (event) => {
        // Disabled
    };

    return (
        <div className="animate-fadeIn pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gradient">Kanban Board</h1>
                <p className="text-slate-600 font-medium mt-1">
                    See the ticket status
                </p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-6 snap-x">
                    {Object.entries(columns).map(([status, { title, color, tasks: columnTasks }]) => (
                        <Column
                            key={status}
                            title={title}
                            tasks={columnTasks}
                            status={status}
                            color={color}
                            users={users}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <TaskCard task={tasks.find(t => t.id === activeId)} isDragging users={users} />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
