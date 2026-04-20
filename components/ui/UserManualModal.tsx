import React from 'react';
import Modal from './Modal.tsx';
import Button from './Button.tsx';
// FIX: Replaced DocumentTextIcon with DocumentChartBarIcon as it is not exported from constants.
import { DownloadIcon, CursorArrowRaysIcon, DocumentChartBarIcon } from '../../constants.tsx';
import { ViewName } from '../../types.ts';

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
    startGuide?: (view?: ViewName) => void;
    setCurrentView?: (view: ViewName) => void;
}

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose, startGuide, setCurrentView }) => {
    
    // This URL points to a public Supabase storage bucket named 'documents'.
    // Ensure this bucket exists and the PDF file is uploaded there.
    const pdfUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/documents/INTOURCAMS_User_Manual.pdf`;

    const handleGuideLaunch = (view?: ViewName) => {
        onClose(); // Close this modal first
        setTimeout(() => { // Timeout to allow modal to close before guide starts
            if (startGuide) {
                startGuide(view);
            }
        }, 150);
    };
    
    const handleViewFullManual = () => {
        onClose();
        setTimeout(() => {
            if (setCurrentView) {
                setCurrentView(ViewName.HelpCenter);
            }
        }, 150);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Help & User Manuals" size="2xl">
            <div className="space-y-6">
                
                <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                    Choose an option below to learn more about how to use the INTOURCAMS platform.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Manual */}
                    <div className="p-4 rounded-lg border border-neutral-300-light dark:border-neutral-700-dark bg-neutral-100-light dark:bg-neutral-800-dark">
                        <h3 className="font-semibold text-brand-text-light dark:text-brand-text flex items-center gap-2">
                            <DocumentChartBarIcon className="w-5 h-5" />
                            Written Documentation
                        </h3>
                        <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary mt-1 mb-3">
                            Browse the complete, in-depth user manual with detailed explanations for every feature.
                        </p>
                        <Button
                            variant="primary"
                            onClick={handleViewFullManual}
                            className="w-full sm:w-auto"
                        >
                            Browse Full User Manual
                        </Button>
                    </div>

                    {/* PDF Download */}
                    <div className="p-4 rounded-lg border border-neutral-300-light dark:border-neutral-700-dark bg-neutral-100-light dark:bg-neutral-800-dark">
                         <h3 className="font-semibold text-brand-text-light dark:text-brand-text flex items-center gap-2">
                            <DownloadIcon className="w-5 h-5" />
                            Offline PDF Manual
                        </h3>
                        <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary mt-1 mb-3">
                            Download a printable PDF version of the user manual for offline access.
                        </p>
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto no-underline">
                            <Button
                                variant="secondary"
                                className="w-full"
                            >
                                Download PDF Manual
                            </Button>
                        </a>
                    </div>
                </div>
                
                <div className="not-prose pt-4 border-t border-neutral-300-light dark:border-neutral-700-dark">
                    <h4 className="font-semibold text-brand-text-light dark:text-brand-text flex items-center gap-2"><CursorArrowRaysIcon className="w-5 h-5" /> Interactive Guides</h4>
                    <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">Launch a step-by-step tour for a specific section of the application.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch()}>Dashboard Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.TourismCluster)}>Clusters Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.TourismMapping)}>Mapping Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.EventsCalendar)}>Events Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.GrantApplications)}>Grants Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.ManageMyClusters)}>My Clusters Guide</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleGuideLaunch(ViewName.AIPlanner)}>AI Planner Guide</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
export default UserManualModal;