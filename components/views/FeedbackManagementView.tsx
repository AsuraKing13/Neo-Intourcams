
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Select from '../ui/Select.tsx';
import { useAppContext } from '../AppContext.tsx';
import { Feedback, FeedbackStatus } from '../../types.ts';
import Spinner from '../ui/Spinner.tsx';
// Fixed: Imported EventAnalyticsIcon instead of ChartBarIcon
import { CheckCircleIcon, EyeIcon, SparklesIcon, EventAnalyticsIcon } from '../../constants.tsx';
import { useToast } from '../ToastContext.tsx';
import { summarizeFeedbackAI } from '../../services/gemini.ts';

const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'seen', 'archived'];
const STATUS_OPTIONS = [{ value: 'all', label: 'All Statuses' }, ...FEEDBACK_STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))];

const getStatusBadgeClasses = (status: FeedbackStatus) => {
    switch (status) {
        case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'seen': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'archived': return 'bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-200';
        default: return '';
    }
};

const FeedbackCard: React.FC<{
    feedback: Feedback;
    onStatusChange: (id: string, status: FeedbackStatus) => void;
    isUpdating: boolean;
}> = ({ feedback, onStatusChange, isUpdating }) => {
    const { users } = useAppContext();
    const author = useMemo(() => feedback.user_id ? users.find(u => u.id === feedback.user_id) : null, [users, feedback.user_id]);

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-grow">
                    <p className="text-brand-text-light dark:text-brand-text whitespace-pre-wrap">{feedback.content}</p>
                    {feedback.page_context && (
                        <p className="mt-2 text-xs text-brand-text-secondary italic">Context: {feedback.page_context}</p>
                    )}
                </div>
                <div className="flex-shrink-0 w-full sm:w-56 space-y-3">
                    <div className="p-2 bg-neutral-100-light dark:bg-neutral-800-dark rounded-md">
                        <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">Submitted By</p>
                        <p className="font-semibold text-sm truncate">{author ? `${author.name}` : 'Anonymous'}</p>
                    </div>
                    <div className="p-2 bg-neutral-100-light dark:bg-neutral-800-dark rounded-md">
                        <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary">Status</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusBadgeClasses(feedback.status)}`}>
                            {feedback.status}
                        </span>
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200-light dark:border-neutral-700-dark flex justify-end items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onStatusChange(feedback.id, 'seen')} disabled={isUpdating || feedback.status === 'seen'} leftIcon={<EyeIcon className="w-4 h-4" />}>Seen</Button>
                <Button variant="ghost" size="sm" onClick={() => onStatusChange(feedback.id, 'archived')} disabled={isUpdating || feedback.status === 'archived'} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>Archive</Button>
            </div>
        </Card>
    );
};

const FeedbackManagementView: React.FC = () => {
    const { feedback: allFeedback, isLoadingFeedback, updateFeedbackStatus } = useAppContext();
    const { showToast } = useToast();
    const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    
    // AI Summarization State
    const [aiSummary, setAiSummary] = useState<{ summary: string; sentiment: string; priorities: string[] } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const filteredFeedback = useMemo(() => {
        if (statusFilter === 'all') return allFeedback;
        return allFeedback.filter(f => f.status === statusFilter);
    }, [allFeedback, statusFilter]);

    const handleStatusChange = async (id: string, status: FeedbackStatus) => {
        setUpdatingId(id);
        try {
            await updateFeedbackStatus(id, status);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAnalyzeFeedback = async () => {
        if (filteredFeedback.length === 0) {
            showToast("No feedback to analyze in this filter.", "info");
            return;
        }
        setIsAnalyzing(true);
        try {
            const analysis = await summarizeFeedbackAI(filteredFeedback);
            setAiSummary(analysis);
            showToast("Analysis complete!", "success");
        } catch (e) {
            showToast("Failed to analyze feedback with AI.", "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text mb-1">System Feedback</h2>
                    <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">Review and auto-moderate user submissions.</p>
                </div>
                <Button 
                    variant="primary" 
                    onClick={handleAnalyzeFeedback} 
                    isLoading={isAnalyzing}
                    leftIcon={<SparklesIcon className="w-5 h-5" />}
                >
                    AI Summary
                </Button>
            </div>

            {aiSummary && (
                <Card className="border-brand-green border-2 animate-modalShow">
                    <div className="flex items-center gap-2 mb-4">
                        {/* Fixed: Used EventAnalyticsIcon instead of missing ChartBarIcon */}
                        <EventAnalyticsIcon className="w-6 h-6 text-brand-green" />
                        <h3 className="text-lg font-bold text-brand-green-text">AI Executive Insights</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-3">
                            <p className="text-sm font-semibold uppercase text-brand-text-secondary">Executive Summary</p>
                            <p className="text-brand-text text-sm leading-relaxed">{aiSummary.summary}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold uppercase text-brand-text-secondary">Overall Sentiment</p>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                                    aiSummary.sentiment === 'Positive' ? 'bg-green-100 text-green-800' :
                                    aiSummary.sentiment === 'Negative' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {aiSummary.sentiment}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase text-brand-text-secondary mb-2">Top Priorities</p>
                                <ul className="space-y-1">
                                    {aiSummary.priorities.map((p, i) => (
                                        <li key={i} className="text-xs text-brand-text flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-green" /> {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setAiSummary(null)}>Dismiss Analysis</Button>
                    </div>
                </Card>
            )}

            <Card>
                <div className="flex items-center gap-4">
                    <label htmlFor="status-filter" className="text-sm font-medium">Filter:</label>
                    <Select id="status-filter" options={STATUS_OPTIONS} value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} />
                </div>
            </Card>

            {isLoadingFeedback ? (
                <div className="text-center py-10"><Spinner /></div>
            ) : filteredFeedback.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredFeedback.map(item => (
                        <FeedbackCard 
                            key={item.id} 
                            feedback={item} 
                            onStatusChange={handleStatusChange}
                            isUpdating={updatingId === item.id}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center py-12 text-brand-text-secondary">No feedback entries found.</p>
            )}
        </div>
    );
};

export default FeedbackManagementView;
