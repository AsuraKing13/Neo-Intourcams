import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ViewName } from '../../types.ts';
import Header from '../Header.tsx';
import Spinner from '../ui/Spinner.tsx';

// Lazy load views for code splitting
const HomeView = lazy(() => import('../views/HomeView.tsx'));
const DashboardView = lazy(() => import('../views/DashboardView.tsx'));
const TourismClustersView = lazy(() => import('../views/TourismClustersView.tsx'));
const GrantApplicationsView = lazy(() => import('../views/GrantApplicationsView.tsx'));
const EventsCalendarView = lazy(() => import('../views/EventsCalendarView.tsx'));
const UserManagementView = lazy(() => import('../views/UserManagementView.tsx'));
const SettingsView = lazy(() => import('../views/SettingsView.tsx'));
const ManageMyClustersView = lazy(() => import('../views/ManageMyClustersView.tsx'));
const WebsiteManagementView = lazy(() => import('../views/WebsiteManagementView.tsx'));
const TourismStatisticsView = lazy(() => import('../views/TourismStatisticsView.tsx'));
const TourismMappingView = lazy(() => import('../views/TourismMappingView.tsx'));
const FeedbackManagementView = lazy(() => import('../views/FeedbackManagementView.tsx'));
const AIPlannerView = lazy(() => import('../views/AIPlannerView.tsx'));
const HelpCenterView = lazy(() => import('../views/HelpCenterView.tsx'));
const TestingDashboardView = lazy(() => import('../views/TestingDashboardView.tsx'));

import { useAppContext } from '../AppContext.tsx';
import Footer from '../ui/Footer.tsx';
import InteractiveGuide from '../ui/InteractiveGuide.tsx';

interface AuthenticatedLayoutProps {
  handleLogout: () => void;
}

const authenticatedTourSteps = [
    { selector: 'header', title: 'Main Navigation', content: 'This is the main header. You can navigate to different sections of the application, manage settings, and view your notifications here.' },
    { selector: '#global-search-form', title: 'Global Search', content: 'Use this powerful search bar on the dashboard to find any cluster, event, or grant application instantly.' },
    { selector: '#promotion-carousel', title: 'Promotions & Announcements', content: 'Stay updated with the latest news, featured content, and important announcements in this carousel.' },
    { selector: '#notification-bell', title: 'Notifications', content: 'Click the bell icon to see personalized notifications and system alerts that require your attention.' },
    { selector: '#user-profile-menu', title: 'User Profile', content: 'Access your profile settings or log out from your account through this menu.' },
    { selector: '#main-content-area', title: 'Main Content Area', content: 'This is where the main content for each section is displayed. It will change as you navigate through the application.' },
    { selector: 'footer', title: 'Footer Links', content: 'Find legal information, contact details, and the user manual in the footer section at the bottom of the page.' }
];

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ handleLogout }) => {
  const { currentUser, isPhoneView, logPageView } = useAppContext();
  const [currentView, setCurrentView] = useState<ViewName>(ViewName.Dashboard);
  const mainScrollRef = useRef<HTMLElement>(null);
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

  const startGuide = (view?: ViewName) => {
    if (view && view !== ViewName.Dashboard) {
        sessionStorage.setItem('startGuideFor', view);
        setCurrentView(view);
    } else {
        setIsGuideActive(true);
    }
  };

  const renderView = () => {
    const userRole = currentUser?.role?.trim().toLowerCase();
    
    switch (currentView) {
      case ViewName.MainMenu:
        return <HomeView setCurrentView={setCurrentView} />;
      case ViewName.Dashboard:
        return <DashboardView setCurrentView={setCurrentView} />;
      case ViewName.AIPlanner:
        return <AIPlannerView setCurrentView={setCurrentView} />;
      case ViewName.TourismCluster:
        return <TourismClustersView setCurrentView={setCurrentView} />;
      case ViewName.TourismMapping:
        return <TourismMappingView setCurrentView={setCurrentView} />;
      case ViewName.ManageMyClusters: {
        if (userRole === 'tourism player' || userRole === 'admin' || userRole === 'editor') {
          return <ManageMyClustersView setCurrentView={setCurrentView} />;
        }
        return <div className="text-center p-8"><h2 className="text-2xl font-semibold">Access Denied</h2><p>You do not have permission to view this page.</p></div>;
      }
      case ViewName.GrantApplications:
        return <GrantApplicationsView />;
      case ViewName.TourismStatistics:
        return <TourismStatisticsView />;
      case ViewName.EventsCalendar:
        return <EventsCalendarView />;
      case ViewName.UserManagement: {
        if (userRole === 'admin') {
            return <UserManagementView />;
        }
        return <div className="text-center p-8"><h2 className="text-2xl font-semibold">Access Denied</h2><p>You do not have permission to view this page.</p></div>;
      }
      case ViewName.WebsiteManagement: {
        if (userRole === 'admin' || userRole === 'editor') {
            return <WebsiteManagementView />;
        }
        return <div className="text-center p-8"><h2 className="text-2xl font-semibold">Access Denied</h2><p>You do not have permission to view this page.</p></div>;
      }
      case ViewName.SystemFeedback: {
        if (userRole === 'admin' || userRole === 'editor') {
          return <FeedbackManagementView />;
        }
        return <div className="text-center p-8"><h2 className="text-2xl font-semibold">Access Denied</h2><p>You do not have permission to view this page.</p></div>;
      }
      case ViewName.Settings:
        return <SettingsView />;
      case ViewName.HelpCenter:
        return <HelpCenterView startGuide={startGuide} />;
      case ViewName.TestingDashboard:
        return <TestingDashboardView />;
      default:
        return <DashboardView setCurrentView={setCurrentView} />;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-brand-bg-light dark:bg-brand-bg">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            handleLogout={handleLogout}
            scrollContainerRef={mainScrollRef}
          />
          <main ref={mainScrollRef} id="main-content-area" className="flex-1 overflow-x-hidden overflow-y-auto bg-content-bg-light dark:bg-content-bg custom-scrollbar pt-16">
            <div className={`transition-all duration-500 ease-in-out ${isPhoneView ? 'max-w-sm mx-auto my-4 border-4 border-neutral-400 dark:border-neutral-600 rounded-2xl shadow-2xl overflow-hidden' : ''}`}>
              <div className={currentView === ViewName.Dashboard ? 'mt-[-4rem]' : 'p-4 sm:p-6'}>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner className="w-10 h-10" /></div>}>
                  {renderView()}
                </Suspense>
              </div>
            </div>
            <Footer setCurrentView={setCurrentView} />
          </main>
        </div>
      </div>
      <InteractiveGuide steps={authenticatedTourSteps} isOpen={isGuideActive} onClose={() => setIsGuideActive(false)} />
    </>
  );
};

export default AuthenticatedLayout;