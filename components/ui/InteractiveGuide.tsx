import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { XMarkIcon } from '../../constants.tsx';

interface GuideStep {
    selector: string;
    title: string;
    content: string;
}

interface InteractiveGuideProps {
    steps: GuideStep[];
    isOpen: boolean;
    onClose: () => void;
}

const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ steps, isOpen, onClose }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [navigationDirection, setNavigationDirection] = useState<'next' | 'prev'>('next');

    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

    const handleClose = useCallback(() => {
        setCurrentStepIndex(0); // Reset for next time
        onClose();
    }, [onClose]);

    const goToNext = useCallback(() => {
        setNavigationDirection('next');
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    }, [currentStepIndex, steps.length, handleClose]);

    const goToPrev = useCallback(() => {
        setNavigationDirection('prev');
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);
    
    const updateTargetPosition = useCallback(() => {
        if (!currentStep?.selector) {
            setTargetRect(null);
            return;
        }
        try {
            const element = document.querySelector(currentStep.selector);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
            } else {
                setTargetRect(null);
            }
        } catch (e) {
            console.error("Invalid selector:", currentStep.selector);
            setTargetRect(null);
        }
    }, [currentStep]);

    // Effect for open/close state: Manages listeners and body scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
            
            // Focus Trap Logic
            if (event.key === 'Tab' && tooltipRef.current) {
                const focusableElements = tooltipRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled])'
                );
                if (focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, handleClose]);

    // Effect for step changes: Scroll to element and set focus
    useEffect(() => {
        if (!isOpen || !currentStep) {
            setTargetRect(null);
            return;
        }

        const element = document.querySelector(currentStep.selector);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            const timer = setTimeout(() => {
                updateTargetPosition();
                // Set initial focus for the step
                const focusableButtons = tooltipRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
                if (focusableButtons) {
                    const nextButton = Array.from(focusableButtons).find(btn => (btn as HTMLElement).textContent?.includes('Next') || (btn as HTMLElement).textContent?.includes('Done'));
                    (nextButton || focusableButtons[0])?.focus();
                }
            }, 400); // Wait for scroll and position update

            return () => clearTimeout(timer);
        } else {
            console.warn(`Guide element not found: ${currentStep.selector}. Skipping.`);
            if (navigationDirection === 'next') {
                goToNext();
            } else {
                goToPrev();
            }
        }
    }, [currentStep, isOpen, goToNext, goToPrev, updateTargetPosition, navigationDirection]);

    // Effect for window events: Keep highlight box sticky on scroll/resize
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateTargetPosition, { passive: true });
            window.addEventListener('resize', updateTargetPosition, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', updateTargetPosition);
            window.removeEventListener('resize', updateTargetPosition);
        };
    }, [isOpen, updateTargetPosition]);

    const tooltipPosition = useMemo(() => {
        if (!targetRect || !tooltipRef.current) return { top: '-9999px', left: '-9999px', opacity: 0 };

        const tooltipHeight = tooltipRef.current.offsetHeight;
        const tooltipWidth = 320; // Corresponds to w-80
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const spaceAbove = targetRect.top;

        let top;
        if (spaceBelow > tooltipHeight + 20) {
            top = targetRect.bottom + 10;
        } else if (spaceAbove > tooltipHeight + 20) {
            top = targetRect.top - tooltipHeight - 10;
        } else {
            top = window.innerHeight / 2 - tooltipHeight / 2;
        }

        const left = Math.max(10, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - (tooltipWidth + 10)));
        
        const isTargetVisible = targetRect.top < window.innerHeight && targetRect.bottom > 0;

        return { top: `${top}px`, left: `${left}px`, opacity: isTargetVisible ? 1 : 0 };
    }, [targetRect]);


    if (!isOpen || !currentStep) return null;

    return (
        <div className="fixed inset-0 z-[9998]" aria-live="polite">
            {/* Highlight Box and Overlay */}
            {targetRect && (
                <div
                    className="fixed transition-all duration-300 ease-in-out border-2 border-white rounded-md"
                    style={{
                        top: targetRect.top - 5,
                        left: targetRect.left - 5,
                        width: targetRect.width + 10,
                        height: targetRect.height + 10,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                    }}
                    aria-hidden="true"
                />
            )}
            
            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className="fixed z-[9999] w-80 bg-card-bg-light dark:bg-card-bg rounded-lg shadow-2xl p-5 text-brand-text-light dark:text-brand-text animate-modalShow transition-all duration-300 ease-in-out"
                style={tooltipPosition}
                role="dialog"
                aria-modal="true"
                aria-labelledby="guide-title"
                aria-describedby="guide-content"
            >
                <h3 id="guide-title" className="text-lg font-bold text-brand-green-text dark:text-brand-dark-green-text mb-2">{currentStep.title}</h3>
                <p id="guide-content" className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">{currentStep.content}</p>
                <div className="flex justify-between items-center mt-4">
                    <span className="text-xs font-bold">{currentStepIndex + 1} / {steps.length}</span>
                    <div className="space-x-2">
                        {currentStepIndex > 0 && (
                            <button onClick={goToPrev} className="px-3 py-1 text-sm font-semibold rounded-md hover:bg-neutral-200-light dark:hover:bg-neutral-700-dark">Previous</button>
                        )}
                        <button onClick={goToNext} className="px-4 py-2 text-sm font-semibold text-white bg-brand-green dark:bg-brand-dark-green rounded-md hover:bg-brand-green-dark dark:hover:bg-brand-dark-green-hover">
                            {currentStepIndex === steps.length - 1 ? 'Done' : 'Next'}
                        </button>
                    </div>
                </div>
                 <button onClick={handleClose} className="absolute top-2 right-2 p-1 rounded-full hover:bg-neutral-200-light dark:hover:bg-neutral-700-dark" aria-label="Close guide">
                    <XMarkIcon className="w-5 h-5"/>
                 </button>
            </div>
        </div>
    );
};

export default InteractiveGuide;