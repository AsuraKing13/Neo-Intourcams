import React, { useState } from 'react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    SparklesIcon, 
    BeakerIcon, 
    UsersIcon, 
    ShieldCheckIcon,
    ArrowPathIcon as RefreshIcon
} from '../../constants.tsx';
import { 
    summarizeFeedbackAI, 
    generateClusterDescription, 
    generateEventAnalyticsInsight, 
    generateItineraryRecommendations 
} from '../../services/gemini.ts';
import Spinner from '../ui/Spinner.tsx';

interface TestResult {
    name: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    message?: string;
}

const TestingDashboardView: React.FC = () => {
    const [fatResults, setFatResults] = useState<TestResult[]>([
        { name: 'Feedback Summarization', status: 'pending' },
        { name: 'Cluster Description Generation', status: 'pending' },
        { name: 'Event Analytics Insight', status: 'pending' },
        { name: 'Itinerary Recommendations', status: 'pending' },
    ]);
    const [isSimulatingSuspension, setIsSimulatingSuspension] = useState((window as any).__SIMULATE_AI_SUSPENSION || false);

    const toggleSuspension = () => {
        const newValue = !isSimulatingSuspension;
        setIsSimulatingSuspension(newValue);
        (window as any).__SIMULATE_AI_SUSPENSION = newValue;
    };

    const runFatTests = async () => {
        const results = [...fatResults];
        
        // Test 1: Feedback
        results[0].status = 'running';
        setFatResults([...results]);
        try {
            await summarizeFeedbackAI([{ 
                id: '1', 
                content: 'Great system!', 
                status: 'new', 
                created_at: '', 
                user_id: '', 
                user_email: '', 
                page_context: '' 
            }]);
            results[0].status = 'passed';
        } catch (e: any) {
            results[0].status = 'failed';
            results[0].message = e.message;
        }
        setFatResults([...results]);

        // Test 2: Cluster Description
        results[1].status = 'running';
        setFatResults([...results]);
        try {
            await generateClusterDescription('Mount Santubong', ['Nature', 'Hiking'], 'adventurous');
            results[1].status = 'passed';
        } catch (e: any) {
            results[1].status = 'failed';
            results[1].message = e.message;
        }
        setFatResults([...results]);

        // Test 3: Event Analytics
        results[2].status = 'running';
        setFatResults([...results]);
        try {
            await generateEventAnalyticsInsight('TOTAL:10#MONTHS:Jan:2|Feb:3#CATS:Culture:5#SAMPLES:Festival A|Festival B', 2024, false);
            results[2].status = 'passed';
        } catch (e: any) {
            results[2].status = 'failed';
            results[2].message = e.message;
        }
        setFatResults([...results]);

        // Test 4: Itinerary
        results[3].status = 'running';
        setFatResults([...results]);
        try {
            await generateItineraryRecommendations({ duration: 3, activities: new Set(['Nature']) }, [{ id: '1', name: 'Bako National Park', category: ['Nature'], location: 'Kuching' }]);
            results[3].status = 'passed';
        } catch (e: any) {
            results[3].status = 'failed';
            results[3].message = e.message;
        }
        setFatResults([...results]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text flex items-center gap-2">
                        <BeakerIcon className="w-8 h-8 text-brand-green" />
                        AI Feature Testing Dashboard (FAT/HAT)
                    </h2>
                    <p className="text-brand-text-secondary text-sm">Validate AI integrations and error handling flows.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                        <span className="text-xs font-bold uppercase">Simulate Suspension</span>
                        <button 
                            onClick={toggleSuspension}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isSimulatingSuspension ? 'bg-red-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSimulatingSuspension ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FAT Section */}
                <Card title="FAT: Feature Acceptance Testing" titleIcon={<ShieldCheckIcon className="w-5 h-5 text-brand-green" />} actions={
                    <Button variant="primary" size="sm" onClick={runFatTests} leftIcon={<RefreshIcon className="w-4 h-4" />}>Run All Tests</Button>
                }>
                    <div className="space-y-4">
                        <p className="text-xs text-brand-text-secondary mb-4">Automated verification of core AI service endpoints and response schemas.</p>
                        {fatResults.map((test, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center gap-3">
                                    {test.status === 'passed' ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : 
                                     test.status === 'failed' ? <XCircleIcon className="w-5 h-5 text-red-500" /> :
                                     test.status === 'running' ? <Spinner className="w-5 h-5" /> :
                                     <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />}
                                    <span className="text-sm font-medium">{test.name}</span>
                                </div>
                                {test.message && <span className="text-[10px] text-red-500 italic max-w-[200px] truncate" title={test.message}>{test.message}</span>}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* HAT Section */}
                <Card title="HAT: Human Acceptance Testing" titleIcon={<UsersIcon className="w-5 h-5 text-brand-green" />}>
                    <div className="space-y-4">
                        <p className="text-xs text-brand-text-secondary mb-4">Guided manual verification of user-facing error handling and recovery flows.</p>
                        
                        <div className="space-y-3">
                            <div className="p-4 rounded-lg border border-brand-green/20 bg-brand-green/5">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-4 h-4" />
                                    Test Case: API Key Suspension Recovery
                                </h4>
                                <ol className="text-xs space-y-2 list-decimal pl-4 text-brand-text-secondary">
                                    <li>Toggle <strong>"Simulate Suspension"</strong> at the top right.</li>
                                    <li>Navigate to the <strong>AI Planner</strong> or <strong>Statistics</strong> view.</li>
                                    <li>Attempt to run an AI operation (e.g., "Get Recommendations").</li>
                                    <li><strong>Verify:</strong> A red error card appears with "CRITICAL: The system API key has been suspended".</li>
                                    <li><strong>Verify:</strong> A <strong>"Select API Key"</strong> button is visible.</li>
                                    <li>Click "Select API Key" and follow the dialog (if available in this environment).</li>
                                    <li>Toggle off "Simulate Suspension" and retry the operation.</li>
                                </ol>
                            </div>

                            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                    <RefreshIcon className="w-4 h-4" />
                                    Test Case: Quota Limit Handling
                                </h4>
                                <ol className="text-xs space-y-2 list-decimal pl-4 text-brand-text-secondary">
                                    <li>Run multiple "Deep Research" analyses in <strong>Event Trends</strong>.</li>
                                    <li>Wait for the "Quota Limit Hit" error (429).</li>
                                    <li><strong>Verify:</strong> A yellow warning card appears with a countdown timer.</li>
                                    <li><strong>Verify:</strong> The "Run AI" button is disabled during the cooldown.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TestingDashboardView;
