import React from 'react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { 
    BookOpenIcon, 
    DownloadIcon, 
    CursorArrowRaysIcon, 
    SparklesIcon, 
    GrantApplicationsIcon, 
    MapIcon, 
    BuildingLibraryIcon, 
    DocumentChartBarIcon, 
    PencilIcon,
    ClockIcon,
    InfoIcon,
    CheckCircleIcon,
    UsersIcon,
    GlobeAltIcon
} from '../../constants.tsx';
import { ViewName } from '../../types.ts';

interface HelpCenterViewProps {
    startGuide: (view?: ViewName) => void;
}

const HelpCenterView: React.FC<HelpCenterViewProps> = ({ startGuide }) => {
    const sections = [
        { id: 'introduction', title: '1. Introduction' },
        { id: 'system-overview', title: '2. System Overview' },
        { id: 'getting-started', title: '3. Getting Started' },
        { id: 'user-roles', title: '4. Roles & Permissions' },
        { id: 'module-guide', title: '5. Module Guide' },
        { id: 'grant-workflow', title: '6. Grant Lifecycle' },
        { id: 'ai-features', title: '7. AI Collaboration' },
        { id: 'admin-panel', title: '8. Admin Panel' },
        { id: 'security-privacy', title: '9. Security & Privacy' },
        { id: 'troubleshooting', title: '10. Troubleshooting' },
        { id: 'support', title: '11. Support' },
    ];
    
    const pdfUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/documents/INTOURCAMS_User_Manual.pdf`;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-brand-text-light dark:text-brand-text mb-1 flex items-center gap-3">
                    <BookOpenIcon className="w-8 h-8 text-brand-green dark:text-brand-dark-green-text" />
                    INTOURCAMS Knowledge Base
                </h2>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                    Your definitive guide to Sarawak's Integrated Tourism Coordination and Monitoring System.
                </p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sticky Sidebar */}
                <aside className="w-full lg:w-1/4 lg:sticky top-20 self-start">
                    <div className="p-4 rounded-lg bg-card-bg-light dark:bg-card-bg border border-neutral-300-light dark:border-neutral-700-dark shadow-sm">
                        <h3 className="font-semibold text-brand-text-light dark:text-brand-text mb-3 border-b pb-2 border-neutral-200 dark:border-neutral-700">Contents</h3>
                        <ul className="space-y-2">
                            {sections.map(section => (
                                <li key={section.id}>
                                    <a 
                                        href={`#${section.id}`} 
                                        className="block text-sm text-brand-text-secondary-light dark:text-brand-text-secondary hover:text-brand-green dark:hover:text-brand-dark-green-text transition-colors py-1"
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                                <Button variant="outline" size="sm" className="w-full" leftIcon={<DownloadIcon className="w-4 h-4"/>}>
                                    Download PDF
                                </Button>
                            </a>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="w-full lg:w-3/4 space-y-8 pb-20">
                    <Card id="introduction">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text">1. Introduction</h3>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                leftIcon={<CursorArrowRaysIcon className="w-4 h-4" />}
                                onClick={() => startGuide()}
                            >
                                Start Dashboard Tour
                            </Button>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary space-y-3">
                            <p>INTOURCAMS (Integrated Tourism Coordination and Monitoring System) is a state-of-the-art platform designed specifically for the Sarawak Tourism industry. It bridges the gap between government bodies, tourism service providers (Tourism Players), and the general public.</p>
                            <p>By integrating data analytics, grant management, and AI-driven planning, INTOURCAMS serves as a <strong>Tourism Compass</strong>—guiding stakeholders toward data-backed growth and providing travelers with a curated window into Sarawak's rich offerings.</p>
                        </div>
                    </Card>

                    <Card id="system-overview">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">2. System Overview</h3>
                         <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary">
                            <p>The system is organized into four main operational pillars, designed to work in harmony:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Public Intelligence:</strong> Open access to tourism clusters, events, and broad statistics to encourage travel and investment.</li>
                                <li><strong>Grant Lifecycle Management:</strong> A secure, end-to-end portal for applying, reviewing, and disbursing tourism funds with full audit trails.</li>
                                <li><strong>Resource Monitoring:</strong> Tools for Tourism Players to manage their own locations (Clusters), list products, and view real-time performance analytics.</li>
                                <li><strong>Administrative Oversight:</strong> Global controls for data integrity, user role auditing, system-wide communication, and maintenance controls.</li>
                            </ul>
                        </div>
                    </Card>
                    
                    <Card id="getting-started">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">3. Getting Started</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary space-y-4">
                            <h5>Account Creation & Verification</h5>
                            <p>To register, click <strong>Register</strong> in the top header. You must select an appropriate role (User or Tourism Player). <strong>Important:</strong> You will receive an automated email from Supabase. You must click the verification link in that email before the system will allow you to log in.</p>
                            <h5>Navigation and Dashboards</h5>
                            <p>The <strong>Dashboard</strong> is your home base. Use the <strong>Global Search</strong> at the top of the Dashboard to find anything across the system instantly. The <strong>Bell Icon</strong> in the header will pulse when you have new notifications regarding your grant status or site-wide system alerts.</p>
                            <div className="bg-neutral-100-light dark:bg-neutral-800-dark p-3 rounded-lg border-l-4 border-brand-green flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold mb-1">PRO TIP:</p>
                                    <p className="text-xs">Use the "Planner" menu to have AI design a customized trip based on your budget and interests!</p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                                    onClick={() => startGuide(ViewName.AIPlanner)}
                                >
                                    AI Tour
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card id="user-roles">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">4. User Roles and Permissions</h3>
                        <p className="text-sm text-brand-text-secondary mb-4">Permissions are strictly enforced via Row Level Security (RLS) to ensure data privacy.</p>
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-neutral-100-light dark:bg-neutral-800-dark text-brand-text-secondary-light dark:text-brand-text-secondary">
                                    <tr>
                                        <th className="px-4 py-2">Role</th>
                                        <th className="px-4 py-2">Key Permissions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-brand-text-light dark:text-brand-text">
                                    <tr className="border-b border-neutral-200-light dark:border-neutral-700-dark">
                                        <td className="px-4 py-2 font-medium">Guest</td>
                                        <td className="px-4 py-2">View-only access to public clusters, events, and broad statistics. No itinerary saving.</td>
                                    </tr>
                                    <tr className="border-b border-neutral-200-light dark:border-neutral-700-dark">
                                        <td className="px-4 py-2 font-medium">User</td>
                                        <td className="px-4 py-2">Can apply for grants, save personal itineraries, write reviews, and submit system feedback.</td>
                                    </tr>
                                    <tr className="border-b border-neutral-200-light dark:border-neutral-700-dark">
                                        <td className="px-4 py-2 font-medium">Tourism Player</td>
                                        <td className="px-4 py-2">Includes all User permissions + Manage their own Clusters/Products and view private performance analytics (CTR/Views).</td>
                                    </tr>
                                    <tr className="border-b border-neutral-200-light dark:border-neutral-700-dark">
                                        <td className="px-4 py-2 font-medium">Editor</td>
                                        <td className="px-4 py-2">Manage all public content (Clusters/Events), moderate feedback, and manage dashboard promotions. No user role modification.</td>
                                    </tr>
                                    <tr className="border-b border-neutral-200-light dark:border-neutral-700-dark">
                                        <td className="px-4 py-2 font-medium">Admin</td>
                                        <td className="px-4 py-2">Full system control, user role modification, tier upgrades (Premium), and maintenance mode activation.</td>
                                    </tr>
                                </tbody>
                           </table>
                        </div>
                    </Card>

                    <Card id="module-guide">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">5. Module Guide</h3>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                                <div className="p-2 bg-brand-green/10 rounded-lg"><MapIcon className="w-6 h-6 text-brand-green"/></div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-brand-text-light dark:text-brand-text">Tourism Mapping</h4>
                                        <Button variant="ghost" size="sm" onClick={() => startGuide(ViewName.TourismMapping)} leftIcon={<CursorArrowRaysIcon className="w-3 h-3"/>}>Live Tour</Button>
                                    </div>
                                    <p className="text-sm text-brand-text-secondary">An interactive Leaflet-powered map. Toggle between "Clusters" and "Events" using the filters. Click any marker for a quick summary and a button to get direct Google Maps directions.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                                <div className="p-2 bg-brand-green/10 rounded-lg"><BuildingLibraryIcon className="w-6 h-6 text-brand-green"/></div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-brand-text-light dark:text-brand-text">Cluster & Product Management</h4>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => startGuide(ViewName.TourismCluster)} leftIcon={<CursorArrowRaysIcon className="w-3 h-3"/>}>Browse</Button>
                                            <Button variant="ghost" size="sm" onClick={() => startGuide(ViewName.ManageMyClusters)} leftIcon={<PencilIcon className="w-3 h-3"/>}>Manage</Button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-brand-text-secondary">For Tourism Players: List your homestay, attraction, or association. You can add "Products/Services" (e.g., room rates or tour packages) which appear in the public details view. Use the Performance Analytics tab to see how many travelers are viewing your listing.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40">
                                <div className="p-2 bg-brand-green/10 rounded-lg"><SparklesIcon className="w-6 h-6 text-brand-green"/></div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-brand-text-light dark:text-brand-text">AI Trip Planner</h4>
                                        <Button variant="ghost" size="sm" onClick={() => startGuide(ViewName.AIPlanner)} leftIcon={<CursorArrowRaysIcon className="w-3 h-3"/>}>Live Tour</Button>
                                    </div>
                                    <p className="text-sm text-brand-text-secondary">Powered by Gemini. Enter your budget, duration, and interests. The AI scans our database to suggest real Sarawak locations. You can "Save" these to your personal Itinerary which is stored securely in your account.</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card id="grant-workflow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text">6. Grant Lifecycle</h3>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                leftIcon={<CursorArrowRaysIcon className="w-4 h-4" />}
                                onClick={() => startGuide(ViewName.GrantApplications)}
                            >
                                Launch Grants Tour
                            </Button>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary">
                            <p>Grant applications follow a strictly regulated path to ensure transparency and accountability:</p>
                            <ol className="space-y-4">
                                <li>
                                    <strong>Submission:</strong> User fills the application form. The status is "Pending". Admins are notified.
                                </li>
                                <li>
                                    <strong>Conditional Offer:</strong> Admin reviews the project and sets an "Approved Amount". The user receives a notification and must click "Accept" to proceed.
                                </li>
                                <li>
                                    <strong>Early Reporting (First 80%):</strong> After acceptance, the user must upload an "Early Report". Once Admin approves this, the first disbursement (80% of approved total) is triggered.
                                </li>
                                <li>
                                    <strong>Final Reporting (Remaining 20%):</strong> Near the project end date, the user uploads the "Final Report".
                                </li>
                                <li>
                                    <strong>Completion:</strong> Admin verifies the final report and triggers the remaining 20% disbursement. The application status becomes "Complete".
                                </li>
                            </ol>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded border border-yellow-200 mt-4">
                                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                                    <InfoIcon className="w-4 h-4"/> IMPORTANT LIMITATIONS
                                </p>
                                <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">If a report is rejected 3 times, the application is automatically closed. Applicants must ensure documentation is accurate and follows the official MTCP guidelines linked on the Grants page.</p>
                            </div>
                        </div>
                    </Card>

                    <Card id="ai-features">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">7. AI Collaboration Tools</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary space-y-4">
                            <p>INTOURCAMS features a "Human-in-the-loop" AI design. This is most prominent in the <strong>Statistics</strong> module:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                                <div className="p-4 border rounded-lg border-brand-green/20 bg-neutral-50 dark:bg-neutral-800/40">
                                    <h5 className="font-bold flex items-center gap-2 text-brand-text-light dark:text-brand-text"><GlobeAltIcon className="w-4 h-4"/> Deep Research</h5>
                                    <p className="text-xs mt-2">AI doesn't just look at our database; it performs real-time web research to identify regional trends, competitor performance, and upcoming global tourism shifts relevant to Sarawak.</p>
                                </div>
                                <div className="p-4 border rounded-lg border-brand-green/20 bg-neutral-50 dark:bg-neutral-800/40">
                                    <h5 className="font-bold flex items-center gap-2 text-brand-text-light dark:text-brand-text"><PencilIcon className="w-4 h-4"/> Human Synthesis</h5>
                                    <p className="text-xs mt-2">Admins can manually edit AI reports. Use the "Refine with AI" button to have Gemini polish your rough bullet points into a professional executive summary.</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                     <Card id="admin-panel">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">8. Admin Panel</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary space-y-4">
                           <h5>Website Management</h5>
                           <p>Admins can set a global <strong>Site-Wide Banner</strong> for urgent news. They can also activate <strong>Maintenance Mode</strong>, which redirects all non-admin traffic to a splash screen with a custom message. This is essential for safe database updates.</p>
                           <h5>User Auditing & Tiers</h5>
                           <p>The User Management view allows Admins to upgrade users to "Premium" tier. Premium users gain access to the "Trends Analytics" and "ROI Statistics" views, which contain sensitive financial and engagement data.</p>
                           <h5>Batch Operations</h5>
                           <p>Use the "Batch Upload" feature in the Clusters view to add hundreds of locations via CSV. Download the template first to ensure column headers match exactly.</p>
                        </div>
                    </Card>
                    
                    <Card id="security-privacy">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">9. Security & Privacy</h3>
                         <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary">
                           <p>We use Row Level Security (RLS) to ensure data isolation. A "Tourism Player" can only see the edit buttons for the clusters they own. Grant document uploads are stored in private, encrypted buckets. When an Admin views your report, the system generates a temporary, single-use URL that expires after 60 seconds to prevent unauthorized file sharing.</p>
                        </div>
                    </Card>
                    
                    <Card id="troubleshooting">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">10. Troubleshooting</h3>
                         <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary space-y-6">
                           <div>
                                <h6 className="font-bold text-brand-text-light dark:text-brand-text">"I am a Tourism Player but don't see the Manage menu."</h6>
                                <p className="text-xs">Verify your role under <strong>Settings &rarr; Profile</strong>. If it says "User", an Admin must manually verify your credentials and upgrade your role in the User Management view. Verification typically takes 24-48 hours.</p>
                           </div>
                           
                           <div>
                                <h6 className="font-bold text-brand-text-light dark:text-brand-text">"The AI Planner says Quota Exceeded."</h6>
                                <p className="text-xs">Deep research tasks utilize a shared global API quota. If exceeded, the system enters a 45-second cooldown. Simply wait a moment and try again. This does not affect your personal account status.</p>
                           </div>
                           
                           <div>
                                <h6 className="font-bold text-brand-text-light dark:text-brand-text">"My grant application disappeared."</h6>
                                <p className="text-xs">Check the <strong>Status Filter</strong> on the Grant Applications page. By default, it may be showing "In Progress". If your application was "Rejected" or "Completed", you must set the filter to "All" or the specific status to see it in the list.</p>
                           </div>

                            <div>
                                <h6 className="font-bold text-brand-text-light dark:text-brand-text">"I can't upload my report PDF."</h6>
                                <p className="text-xs">Ensure the file size is under 5MB and is a standard PDF format. If you have already been rejected 3 times for that stage, the upload button will be permanently disabled for that specific application.</p>
                           </div>
                        </div>
                    </Card>

                    <Card id="support">
                        <h3 className="font-semibold text-xl text-brand-green-text dark:text-brand-dark-green-text mb-4">11. Support & Contact</h3>
                         <div className="prose prose-sm dark:prose-invert max-w-none text-brand-text-secondary-light dark:text-brand-text-secondary">
                           <p>For urgent technical issues (system crashes, login failures), please email our engineering team at <a href="mailto:intourcams@gmail.com" className="text-brand-green font-bold">intourcams@gmail.com</a>.</p>
                           <p className="mt-2">For suggestions on new tourism features or UI improvements, please use the <strong>System Feedback</strong> tool located in your Profile Settings. Submissions are reviewed weekly by the system editors.</p>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
};

export default HelpCenterView;