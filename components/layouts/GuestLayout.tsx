import React, { useState, useEffect, useRef } from 'react';
import { ViewName } from '../../types.ts';
import Header from '../Header.tsx';
import DashboardView from '../views/DashboardView.tsx';
import TourismClustersView from '../views/TourismClustersView.tsx';
import EventsCalendarView from '../views/EventsCalendarView.tsx';
import TourismStatisticsView from '../views/TourismStatisticsView.tsx';
import LoginPromptModal from '../ui/LoginPromptModal.tsx';
import LoginModal from '../auth/LoginModal.tsx';
import RegistrationModal from '../auth/RegistrationModal.tsx';
import GlobalNotificationBanner from '../ui/GlobalNotificationBanner.tsx';
import { useAppContext } from '../AppContext.tsx';
import TourismMappingView from '../views/TourismMappingView.tsx';
import AIPlannerView from '../views/AIPlannerView.tsx';
import Spinner from '../ui/Spinner.tsx';
import Footer from '../ui/Footer.tsx';
import InteractiveGuide from '../ui/InteractiveGuide.tsx';
import HelpCenterView from '../views/HelpCenterView.tsx';

interface GuestLayoutProps {
  onSwitchToLogin: () => void;
}

const guestTourSteps = [
    { selector: 'header', title: 'Main Navigation', content: 'Welcome to INTOURCAMS! Use the header to explore different public sections like Tourism Clusters, the interactive Map, and the Events Calendar.' },
    { selector: '#global-search-form', title: 'Global Search', content: 'Looking for something specific? Use this search bar on the dashboard to instantly find any public cluster or event.' },
    { selector: '#promotion-carousel', title: 'Promotions & Announcements', content: 'Stay updated with the latest news, featured content, and important announcements in this carousel.' },
    { selector: '#guest-login-button', title: 'Login & Register', content: 'Click here to log in or create an account to unlock more features like applying for grants and creating your own trip itinerary.' },
    { selector: '#main-content-area', title: 'Main Content Area', content: 'This is where the main content for each section is displayed. It will change as you navigate through the application.' },
    { selector: 'footer', title: 'Footer Links', content: 'Find legal information, contact details, and the full user manual in the footer section at the bottom of the page.' }
];

const GuestLayout: React.FC<GuestLayoutProps> = ({ onSwitchToLogin }) => {
  const [currentView, setCurrentView] = useState<ViewName>(ViewName.Dashboard);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const { notifications, logPageView } = useAppContext();
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const [isGuideActive, setIsGuideActive] = useState(false);

  useEffect(() => {
    if (!sessionIdRef.current) {
        let sid = sessionStorage.getItem('app_session_id');
        if (!sid) {
            sid = crypto.randomUUID();
            sessionStorage.setItem('app_session_id', sid);
        }
        sessionIdRef.current = sid;
    }
    if (sessionIdRef.current) {
        logPageView(currentView, sessionIdRef.current);
    }
  }, [currentView, logPageView]);


  const handleAuthRequired = (message?: string) => {
    setLoginPromptMessage(message || '');
    setIsLoginPromptOpen(true);
  };

  const handlePromptLogin = () => {
    setIsLoginPromptOpen(false);
    setIsLoginModalOpen(true);
  };

  const handlePromptRegister = () => {
    setIsLoginPromptOpen(false);
    setIsRegistrationModalOpen(true);
  };

  const startGuide = (view?: ViewName) => {
    if (view && view !== ViewName.Dashboard) {
        sessionStorage.setItem('startGuideFor', view);
        setCurrentView(view);
    } else {
        setIsGuideActive(true);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case ViewName.Dashboard:
        return <DashboardView setCurrentView={setCurrentView} onAuthRequired={handleAuthRequired} />;
      case ViewName.AIPlanner:
        return <AIPlannerView setCurrentView={setCurrentView} onAuthRequired={handleAuthRequired} />;
      case ViewName.TourismCluster:
        return <TourismClustersView setCurrentView={setCurrentView} />;
      case ViewName.TourismMapping:
        return <TourismMappingView setCurrentView={setCurrentView} />;
      case ViewName.TourismStatistics:
        return <TourismStatisticsView />;
      case ViewName.EventsCalendar:
        return <EventsCalendarView />;
      case ViewName.HelpCenter:
        return <HelpCenterView startGuide={startGuide} />;
      default:
        return <DashboardView setCurrentView={setCurrentView} onAuthRequired={handleAuthRequired} />;
    }
  };

  return (
    <>
      <div className="relative min-h-screen bg-content-bg-light dark:bg-content-bg flex flex-col">
        <Header 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          isGuest={true} 
          onSwitchToLogin={() => setIsLoginModalOpen(true)}
          onRegister={() => setIsRegistrationModalOpen(true)}
        />
        <GlobalNotificationBanner notifications={notifications} onVisibilityChange={setIsBannerVisible} />
        <main id="main-content-area" className={`flex-grow transition-all duration-300 ${isBannerVisible ? 'pt-[calc(4rem+2.75rem)]' : 'pt-16'}`}>
           <div className={currentView === ViewName.Dashboard ? 'mt-[-4rem]' : "p-4 sm:p-6"}>
                {renderView()}
            </div>
        </main>
        <Footer setCurrentView={setCurrentView} />
      </div>
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onLogin={handlePromptLogin}
        onRegister={handlePromptRegister}
        message={loginPromptMessage}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      <RegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
      />
      <InteractiveGuide steps={guestTourSteps} isOpen={isGuideActive} onClose={() => setIsGuideActive(false)} />
    </>
  );
};

export default GuestLayout;