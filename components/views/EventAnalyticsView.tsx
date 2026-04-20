import React, { useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
import Card from '../ui/Card.tsx';
import Select from '../ui/Select.tsx';
import { CalendarDaysIcon, EventAnalyticsIcon, SparklesIcon, ArrowPathIcon as RefreshIcon, QuestionMarkCircleIcon, ClockIcon, GlobeAltIcon, InfoIcon, PencilIcon, CheckCircleIcon, ArrowUturnLeftIcon } from '../../constants.tsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ThemeContext } from '../ThemeContext.tsx';
import { useAppContext } from '../AppContext.tsx';
import { AppEvent } from '../../types.ts';
import Spinner from '../ui/Spinner.tsx';
import { generateEventAnalyticsInsight, refineAnalysisAI } from '../../services/gemini.ts';
import Button from '../ui/Button.tsx';
import { useToast } from '../ToastContext.tsx';
import InteractiveGuide from '../ui/InteractiveGuide.tsx';

const eventAnalyticsTourSteps = [
    { selector: '#event-analysis-controls', title: 'Analysis Hub', content: 'Filter data by year or run our advanced AI insight engine.' },
    { selector: '#event-stat-cards', title: 'Quick Summary', content: 'See total event counts and peak seasons at a glance.' },
    { selector: '#strategic-insights-panel', title: 'AI Strategic Reports', content: 'Admins can generate deep-research reports here. Toggle "Deep Research" for web-grounded market analysis.' },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card>
        <div className="flex items-center">
            <div className="p-3 bg-neutral-200-light dark:bg-neutral-700-dark rounded-lg mr-4 text-brand-green dark:text-brand-dark-green-text">
                {icon}
            </div>
            <div>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary text-sm">{title}</p>
                <p className="text-2xl font-bold text-brand-green-text dark:text-brand-dark-green-text truncate" title={value}>{value}</p>
            </div>
        </div>
    </Card>
);

const EventAnalyticsView: React.FC = () => {
    const { theme } = useContext(ThemeContext);
    const { showToast } = useToast();
    const { events, isLoadingEvents, getCachedAiInsight, setCachedAiInsight, getLatestEventTimestampForYear, currentUser } = useAppContext();
    
    const [aiInsight, setAiInsight] = useState<{ summary: string; previous_content?: string | null; sources: any[]; isGrounded?: boolean } | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const [isGuideActive, setIsGuideActive] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editableText, setEditableText] = useState('');
    
    const isFetchingRef = useRef(false);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const isAdminOrEditor = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Editor', [currentUser]);

    const yearOptions = useMemo(() => {
        if (events.length === 0) return [{ value: currentYear, label: String(currentYear) }];
        const years = new Set(events.map(e => new Date(e.start_date).getFullYear()));
        years.add(currentYear);
        return Array.from(years).sort((a,b) => b-a).map(year => ({ value: year, label: String(year) }));
    }, [events, currentYear]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => new Date(e.start_date).getFullYear() === selectedYear);
    }, [events, selectedYear]);

    const eventsByMonth = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return monthNames.map((name, index) => {
            const count = filteredEvents.filter(e => new Date(e.start_date).getMonth() === index).length;
            return { month: name, 'Number of Events': count };
        });
    }, [filteredEvents]);

    const peakMonth = useMemo(() => {
        if (filteredEvents.length === 0) return 'N/A';
        const sorted = [...eventsByMonth].sort((a, b) => b['Number of Events'] - a['Number of Events']);
        return sorted[0]['Number of Events'] > 0 ? sorted[0].month : 'N/A';
    }, [eventsByMonth, filteredEvents]);

    const loadSummary = useCallback(async (forceRefresh = false) => {
        if (filteredEvents.length === 0 || isFetchingRef.current) {
            setAiInsight(null);
            return;
        }
        
        isFetchingRef.current = true;
        setIsGeneratingSummary(true);
        setError(null);
        setIsEditing(false);
        try {
            const cacheKey = String(selectedYear);
            if (forceRefresh && isAdminOrEditor) {
                const monthDist = eventsByMonth.map(m => `${m.month}:${m['Number of Events']}`).join('|');
                const categoryCounts = filteredEvents.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const catDist = Object.entries(categoryCounts).map(([k, v]) => `${k}:${v}`).join('|');
                const topEvents = [...filteredEvents].sort((a, b) => (b.description?.length || 0) - (a.description?.length || 0)).slice(0, 5).map(e => `${e.title}(${e.category})`).join('|');
                const distilledDigest = `TOTAL:${filteredEvents.length}#MONTHS:${monthDist}#CATS:${catDist}#SAMPLES:${topEvents}`;

                const insight = await generateEventAnalyticsInsight(distilledDigest, selectedYear, useDeepResearch);
                const updatedInsight = { ...insight, previous_content: aiInsight?.summary || null };
                setAiInsight(updatedInsight);
                const timestamp = await getLatestEventTimestampForYear(selectedYear);
                await setCachedAiInsight('event_analytics', cacheKey, JSON.stringify(updatedInsight), timestamp || new Date().toISOString());
                
                if (insight.isGrounded) setCooldown(45);
            } else {
                const cached = await getCachedAiInsight('event_analytics', cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached.content);
                    setAiInsight({ ...parsed, previous_content: cached.previous_content });
                } else setAiInsight(null);
            }
        } catch (err: any) {
            setError(err.message);
            if (err.message.includes('Quota')) setCooldown(60);
        } finally {
            setIsGeneratingSummary(false);
            isFetchingRef.current = false;
        }
    }, [selectedYear, isAdminOrEditor, filteredEvents, eventsByMonth, getCachedAiInsight, setCachedAiInsight, getLatestEventTimestampForYear, useDeepResearch, aiInsight?.summary]);

    useEffect(() => { loadSummary(); }, [selectedYear, loadSummary]);

    const handleEditSave = async () => {
        if (!aiInsight) return;
        setIsSavingEdit(true);
        try {
            const cacheKey = String(selectedYear);
            const updatedInsight = { ...aiInsight, summary: editableText };
            setAiInsight(updatedInsight);
            const timestamp = await getLatestEventTimestampForYear(selectedYear);
            await setCachedAiInsight('event_analytics', cacheKey, JSON.stringify(updatedInsight), timestamp || new Date().toISOString());
            setIsEditing(false);
            showToast("Analysis updated successfully.", "success");
        } catch (err: any) {
            showToast("Failed to save edits.", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleUndo = async () => {
        if (!aiInsight?.previous_content) return;
        setEditableText(aiInsight.previous_content);
        setIsEditing(true); 
        showToast("Previous version loaded. Click Save to confirm restoration.", "info");
    };

    const handleAiRefine = async () => {
        setIsRefining(true);
        try {
            const refined = await refineAnalysisAI(editableText || aiInsight?.summary || "");
            setEditableText(refined);
            setIsEditing(true);
            showToast("AI synthesis complete.", "success");
        } catch (err: any) {
            showToast("AI refinement failed.", "error");
        } finally {
            setIsRefining(false);
        }
    };

    const toggleEditMode = () => {
        if (!isEditing) setEditableText(aiInsight?.summary || "");
        setIsEditing(!isEditing);
    };

    const chartColors = useMemo(() => {
        const isDark = theme === 'dark';
        return {
          axis: isDark ? '#A0A0A0' : '#566573',
          grid: isDark ? '#333333' : '#DEE2E6',
          tooltipBg: isDark ? '#252525' : '#FFFFFF',
          bar: isDark ? '#4DBA87' : '#004925',
        };
    }, [theme]);

    if (isLoadingEvents) return <div className="text-center py-20"><Spinner className="w-10 h-10 mx-auto" /></div>;

    return (
        <>
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text">Event Trends</h2>
                        <button onClick={() => setIsGuideActive(true)} className="text-brand-text-secondary hover:text-brand-green">
                            <QuestionMarkCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-brand-text-secondary text-sm">Strategic analytics and research.</p>
                </div>
                <div id="event-analysis-controls" className="flex items-center gap-3">
                     {cooldown > 0 && <span className="text-xs text-orange-500 animate-pulse font-medium">Resetting: {cooldown}s</span>}
                     <Select options={yearOptions} value={String(selectedYear)} onChange={e => setSelectedYear(Number(e.target.value))} className="w-32" />
                </div>
            </div>

            <div id="event-stat-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Events This Year" value={filteredEvents.length.toString()} icon={<CalendarDaysIcon className="w-6 h-6" />} />
                <StatCard title="Peak Month" value={peakMonth} icon={<EventAnalyticsIcon className="w-6 h-6" />} />
                <StatCard title="Avg per Month" value={(filteredEvents.length / 12).toFixed(1)} icon={<CalendarDaysIcon className="w-6 h-6" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card title="Monthly Distribution" className="lg:col-span-3">
                    {filteredEvents.length > 0 ? (
                        <div className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={eventsByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                    <XAxis dataKey="month" stroke={chartColors.axis} />
                                    <YAxis stroke={chartColors.axis} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg }} cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="Number of Events" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex flex-col items-center justify-center text-brand-text-secondary italic">
                            <CalendarDaysIcon className="w-12 h-12 mb-2 opacity-20" />
                            <p>No events recorded for {selectedYear}.</p>
                        </div>
                    )}
                </Card>

                <Card id="strategic-insights-panel" title="Strategic Insights" className="lg:col-span-2" actions={
                    isAdminOrEditor && filteredEvents.length > 0 && (
                        <div className="flex items-center gap-2">
                             {!isEditing && (
                                <label className="flex items-center cursor-pointer gap-2 mr-2 group">
                                    <span className={`text-[10px] font-bold uppercase transition-colors ${useDeepResearch ? 'text-brand-green' : 'text-neutral-400'}`}>Deep Research</span>
                                    <div className="relative inline-flex items-center">
                                        <input type="checkbox" className="sr-only peer" checked={useDeepResearch} onChange={e => setUseDeepResearch(e.target.checked)} />
                                        <div className="w-7 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-green"></div>
                                    </div>
                                </label>
                             )}
                            <Button variant="ghost" size="sm" onClick={() => isEditing ? handleEditSave() : loadSummary(true)} isLoading={isGeneratingSummary || isSavingEdit} disabled={cooldown > 0} leftIcon={isEditing ? <CheckCircleIcon className="w-4 h-4"/> : (cooldown > 0 ? <ClockIcon className="w-4 h-4"/> : <RefreshIcon className="w-4 h-4"/>)}>
                                {isEditing ? 'Save' : (cooldown > 0 ? `${cooldown}s` : 'Run AI')}
                            </Button>
                        </div>
                    )
                }>
                    {isGeneratingSummary ? (
                        <div className="text-center py-10">
                            <Spinner />
                            <p className="mt-2 text-xs text-brand-text-secondary font-medium animate-pulse">
                                {useDeepResearch ? 'Conducting Deep Web Research...' : 'Processing Internal Metrics...'}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs">
                             <p className="font-bold">Error: {error}</p>
                             <p className="mt-2">Try disabling "Deep Research" to bypass web quotas.</p>
                             {(error.includes('CRITICAL') || error.includes('Access Denied')) && (window as any).aistudio && (
                                <div className="mt-3">
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={async () => {
                                            await (window as any).aistudio.openSelectKey();
                                            loadSummary(true);
                                        }}
                                    >
                                        Select API Key
                                    </Button>
                                </div>
                             )}
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm leading-relaxed">
                            {aiInsight ? (
                                <>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            {aiInsight.isGrounded ? (
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                                                    <GlobeAltIcon className="w-3 h-3"/> Web-Grounded
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                                                    <InfoIcon className="w-3 h-3"/> Internal
                                                </span>
                                            )}
                                        </div>
                                        {isAdminOrEditor && (
                                            <div className="flex gap-2">
                                                {aiInsight.previous_content && (
                                                    <button onClick={handleUndo} title="Revert to previous version" className="text-brand-text-secondary hover:text-brand-green p-1">
                                                        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button onClick={toggleEditMode} title={isEditing ? "View mode" : "Edit mode"} className={`p-1 ${isEditing ? 'text-brand-green' : 'text-brand-text-secondary hover:text-brand-green'}`}>
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <textarea value={editableText} onChange={e => setEditableText(e.target.value)} rows={10} className="w-full text-xs p-3 rounded-lg bg-neutral-100-light dark:bg-neutral-800-dark border border-neutral-300-light dark:border-neutral-700-dark outline-none focus:ring-1 focus:ring-brand-green" placeholder="Write your own analysis..." />
                                            <div className="flex justify-between items-center gap-2">
                                                <p className="text-[10px] text-brand-text-secondary italic">Changes are not permanent until you click Save.</p>
                                                <Button variant="ghost" size="sm" onClick={handleAiRefine} isLoading={isRefining} leftIcon={<SparklesIcon className="w-3 h-3" />} className="!text-[10px]">Refine with AI</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert">
                                            <p className="text-brand-text-light dark:text-brand-text whitespace-pre-wrap">{aiInsight.summary}</p>
                                        </div>
                                    )}

                                    {aiInsight.sources?.length > 0 && !isEditing && (
                                        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                                            <p className="text-[10px] font-bold mb-2">Web Research Sources:</p>
                                            <ul className="space-y-1">
                                                {aiInsight.sources.map((s:any, i:number) => s.web && (
                                                    <li key={i}><a href={s.web.uri} target="_blank" className="text-[10px] text-brand-green dark:text-brand-dark-green-text hover:underline block truncate max-w-full">🔗 {s.web.title}</a></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-brand-green/30" />
                                    <p className="text-brand-text-secondary italic">No strategic analysis found.</p>
                                    {isAdminOrEditor && filteredEvents.length > 0 && (
                                        <Button variant="primary" size="sm" className="mt-4" onClick={() => loadSummary(true)} disabled={cooldown > 0}>Conduct Analysis</Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
        <InteractiveGuide steps={eventAnalyticsTourSteps} isOpen={isGuideActive} onClose={() => setIsGuideActive(false)} />
        </>
    );
};

export default EventAnalyticsView;