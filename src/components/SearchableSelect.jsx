import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Plus } from 'lucide-react';
import clsx from 'clsx';

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = "Select option",
    label,
    required = false,
    allowCreate = false,
    className
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Initial filter when options change
    useEffect(() => {
        setFilteredOptions(options);
    }, [options]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Filter options based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredOptions(options);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = options.filter(option =>
                option.toLowerCase().includes(lowerQuery)
            );
            setFilteredOptions(filtered);
        }
    }, [searchQuery, options]);

    // Cleanup search query on close
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setSearchQuery('');
    };

    const toggleOpen = () => {
        if (!isOpen) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setIsOpen(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
    };

    return (
        <div className={clsx("relative", className)} ref={wrapperRef}>
            {label && <label className="block text-sm font-bold text-slate-700 mb-2">{label} {required && '*'}</label>}

            {/* Main Display Button */}
            <div
                onClick={toggleOpen}
                className={clsx(
                    "w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 rounded-xl flex items-center justify-between cursor-pointer transition-all",
                    isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-indigo-300"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={clsx("font-medium truncate", !value && "text-slate-400")}>
                        {value || placeholder}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {value && (
                        <div
                            onClick={handleClear}
                            className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={14} />
                        </div>
                    )}
                    <ChevronDown size={18} className={clsx("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder={allowCreate ? "Type to search or add new..." : "Search..."}
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelect(option)}
                                    className={clsx(
                                        "px-4 py-3 cursor-pointer transition-colors text-sm font-medium",
                                        value === option ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50",
                                        "truncate"
                                    )}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-1 py-1">
                                {allowCreate && searchQuery.trim() !== '' ? (
                                    <div
                                        onClick={() => handleSelect(searchQuery)}
                                        className="px-4 py-3 cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Add "{searchQuery}"
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                        No results found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
