import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';

// Views
import DashboardView from './views/DashboardView';
import CustomersView from './views/CustomersView';
import JobsView from './views/JobsView';
import CalendarView from './views/CalendarView';
import MobileTechnicianView from './views/MobileTechnicianView';
import ExcelImportWizard from './views/ExcelImportWizard';
import ReportsView from './views/ReportsView';
import TreatmentsSettingsView from './views/TreatmentsSettingsView';
import CustomerConfirmationPortal from './views/CustomerConfirmationPortal';
import RemindersView from './views/RemindersView';
import TechnicianProfileView from './views/TechnicianProfileView';
import LoginPortal from './views/LoginPortal';
import BackupDatabaseView from './views/BackupDatabaseView';
import CreateCustomerModal from './components/CreateCustomerModal';
import FirebasePushSettingsView from './views/FirebasePushSettingsView';
import TechnicianLoginView from './views/TechnicianLoginView';
import LiveMonitorView from './views/LiveMonitorView';
import { getPersistentTechSession, clearPersistentTechSession } from './services/offlineStorage';

import { getDashboardStats } from './api';

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const isDirectConfirmationRoute = pathname.startsWith('/confirmations');
  const urlJobCode = isDirectConfirmationRoute
    ? pathname.replace(/^\/confirmations\/?/, '').split('/')[0]?.split('?')[0]
    : '';

  // Direct Technician or Manager App Deep-Link or PWA standalone launcher
  const isDirectTechRoute = pathname.startsWith('/tech') || pathname.startsWith('/technician') || pathname.startsWith('/manager') || urlParams.has('tech') || urlParams.has('manager') || urlParams.has('job') || urlParams.get('view') === 'tech' || urlParams.get('app') === 'tech' || urlParams.get('app') === 'manager';

  const isMobileOrTabletUserAgent = typeof navigator !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const isPhoneOrPwa = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    isMobileOrTabletUserAgent ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    isDirectTechRoute
  );

  // Extract direct job id from URL: /tech?job=123 OR /tech/job/123 OR ?job=123
  const directJobIdFromUrl = urlParams.get('job') || (pathname.startsWith('/tech/job/') ? pathname.replace(/^\/tech\/job\/?/, '').split('/')[0]?.split('?')[0] : null);

  // Authenticated User State: checks localStorage/sessionStorage. Defaults to null if logged out.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (stored) return JSON.parse(stored);
      return null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState(() => {
    return Boolean(
      (typeof window !== 'undefined') &&
      (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
    );
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (isDirectConfirmationRoute) return 'confirmations';
    if (isPhoneOrPwa) return 'mobile_home';
    const stored = (typeof window !== 'undefined') ? (localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')) : null;
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u?.role === 'SUPERVISOR') return 'jobs';
      } catch (e) {}
    }
    return 'dashboard';
  });

  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role) return u.role;
      }
    } catch (e) {}
    return isPhoneOrPwa ? 'TECHNICIAN' : 'ADMIN';
  });

  const [isMobileView, setIsMobileView] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.appMode === 'MANAGER_APP' || u?.appMode === 'TECH_APP' || u?.role === 'TECHNICIAN') {
          return true;
        }
      }
    } catch (e) {}
    return isPhoneOrPwa;
  });

  // Verify session on app boot
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async r => {
          const txt = await r.text();
          try {
            return JSON.parse(txt);
          } catch (e) {
            return { success: false };
          }
        })
        .then(data => {
          if (data.success && data.user) {
            let storedUser = null;
            try {
              storedUser = JSON.parse(localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user') || 'null');
            } catch (e) {}
            const effectiveUser = {
              ...data.user,
              appMode: storedUser?.appMode || (String(token).startsWith('mgr_') ? 'MANAGER_APP' : undefined)
            };
            setCurrentUser(effectiveUser);
            const resolvedRole = effectiveUser.role || 'TECHNICIAN';
            setCurrentRole(resolvedRole);

            if (resolvedRole === 'SUPERVISOR') {
              setIsMobileView(false);
              const allowedTabs = ['jobs', 'live_monitor', 'customers'];
              if (!allowedTabs.includes(activeTab)) {
                setActiveTab('jobs');
              }
            } else if (isDirectTechRoute || isPhoneOrPwa || effectiveUser.appMode === 'MANAGER_APP' || effectiveUser.appMode === 'TECH_APP' || resolvedRole === 'TECHNICIAN') {
              setIsMobileView(true);
              if (activeTab === 'dashboard') setActiveTab('mobile_home');
              if (resolvedRole === 'TECHNICIAN') {
                localStorage.setItem('tech_preferred_id', String(effectiveUser.id));
              }
            }
          } else {
            getPersistentTechSession().then(sess => {
              if (sess?.technician) {
                const sessRole = sess.role || sess.technician.role || 'TECHNICIAN';
                setCurrentUser(sess.technician);
                setCurrentRole(sessRole);
                setIsMobileView(true);
                setActiveTab('mobile_home');
              } else {
                setCurrentUser(null);
              }
            });
          }
        })
        .catch(() => {
          getPersistentTechSession().then(sess => {
            const user = sess?.technician || (sess?.id ? sess : null);
            if (user) {
              const sessRole = sess?.role || user.role || 'TECHNICIAN';
              setCurrentUser(user);
              setCurrentRole(sessRole);
              setIsMobileView(true);
              setActiveTab('mobile_home');
            } else {
              setCurrentUser(null);
            }
          });
        })
        .finally(() => setIsAuthChecking(false));
    } else {
      // Check permanent IndexedDB technician/manager session
      getPersistentTechSession().then(sess => {
        const user = sess?.technician || (sess?.id ? sess : null);
        if (user) {
          const sessRole = sess?.role || user.role || 'TECHNICIAN';
          setCurrentUser(user);
          setCurrentRole(sessRole);
          setIsMobileView(true);
          setActiveTab('mobile_home');
        } else if (isPhoneOrPwa) {
          setCurrentRole('TECHNICIAN');
          setIsMobileView(true);
          setActiveTab('mobile_home');
        }
        setIsAuthChecking(false);
      });
    }
  }, [isDirectTechRoute, isPhoneOrPwa]);

  // Strict Field Supervisor tab scoping: only allowed 'jobs', 'live_monitor', 'customers'
  useEffect(() => {
    if (currentRole === 'SUPERVISOR') {
      const allowedSupervisorTabs = ['jobs', 'live_monitor', 'customers'];
      if (!allowedSupervisorTabs.includes(activeTab)) {
        setActiveTab('jobs');
      }
    }
  }, [currentRole, activeTab]);

  const handleLoginSuccess = (user, token) => {
    const resolvedRole = user.role || 'TECHNICIAN';
    setCurrentUser(user);
    setCurrentRole(resolvedRole);
    const openMobileApp =
      resolvedRole === 'TECHNICIAN' ||
      user.appMode === 'MANAGER_APP' ||
      user.appMode === 'TECH_APP' ||
      (token && (String(token).startsWith('mgr_') || String(token).startsWith('tech_'))) ||
      isPhoneOrPwa;

    if (openMobileApp) {
      setIsMobileView(true);
      setActiveTab('mobile_home');
      if (resolvedRole === 'TECHNICIAN') {
        localStorage.setItem('tech_preferred_id', String(user.id));
      } else {
        localStorage.removeItem('tech_preferred_id');
      }
    } else {
      setIsMobileView(false);
      setActiveTab(resolvedRole === 'SUPERVISOR' ? 'jobs' : 'dashboard');
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
    } catch (e) {}

    await clearPersistentTechSession();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('tech_preferred_id');
    localStorage.removeItem('tech_session');
    localStorage.removeItem('tech_session_v1');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Direct switch between Admin and Operations Manager
  const handleSwitchUser = async (targetRole) => {
    const targetUsername = targetRole === 'ADMIN' ? 'admin' : 'manager';
    const targetPassword = targetRole === 'ADMIN' ? 'admin123' : 'manager123';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: targetUsername,
          password: targetPassword,
          role: targetRole,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });
      const txt = await res.text();
      const data = JSON.parse(txt);
      if (data.success && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);
        setIsMobileView(false);
        setActiveTab('dashboard');
      }
    } catch (e) {
      console.error('Failed to switch user:', e);
    }
  };

  // Global Add Customer Modal (Accessible from any tab!)
  const [showGlobalAddCustomerModal, setShowGlobalAddCustomerModal] = useState(false);

  // Cross-view selection navigation
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(directJobIdFromUrl ? (parseInt(directJobIdFromUrl, 10) || directJobIdFromUrl) : null);
  const [jobInitialStatusFilter, setJobInitialStatusFilter] = useState('');

  const handleNavigateToTab = (tabName, options = {}) => {
    if (options?.status !== undefined) {
      setJobInitialStatusFilter(options.status);
    }
    setActiveTab(tabName);
  };

  // App metrics & badges
  const [dashboardData, setDashboardData] = useState(null);

  const refreshDashboard = async () => {
    try {
      const res = await getDashboardStats();
      setDashboardData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  // When role changes, sync state
  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    if (newRole === 'TECHNICIAN') {
      setIsMobileView(true);
      setActiveTab('mobile_home');
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    setActiveTab('customers');
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobId(null);
    setTimeout(() => {
      setSelectedJobId(jobId);
      setActiveTab(isMobileView ? 'mobile_home' : 'jobs');
    }, 10);
  };

  // If customer is opening an online confirmation link from SMS / WhatsApp
  if (isDirectConfirmationRoute) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-3 sm:p-6">
        <div className="max-w-xl w-full">
          <CustomerConfirmationPortal
            jobCode={urlJobCode}
            onBack={() => {
              window.location.href = '/';
            }}
          />
        </div>
      </div>
    );
  }

  // Verify token screen while verifying existing token
  if (isAuthChecking && (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-purple-100 text-xs mt-3 font-bold tracking-wide">Loading workspace session...</p>
      </div>
    );
  }

  // If user is not authenticated, show Login Screen
  if (!currentUser) {
    if (isPhoneOrPwa && !urlParams.get('portal')) {
      if (directJobIdFromUrl) {
        // Deep-linked direct job can continue
      } else {
        return <TechnicianLoginView onLoginSuccess={handleLoginSuccess} />;
      }
    } else {
      return (
        <LoginPortal
          onLoginSuccess={handleLoginSuccess}
          technicianOnly={false}
        />
      );
    }
  }

  // Explicit /login route
  const isExplicitLoginRoute = pathname === '/login';
  if (isExplicitLoginRoute) {
    return (
      <LoginPortal
        onLoginSuccess={handleLoginSuccess}
        technicianOnly={false}
      />
    );
  }

  const isManagerMobileApp = currentRole === 'MANAGER' || currentUser?.role === 'MANAGER';
  const mobileEffectiveRole = isManagerMobileApp ? 'MANAGER' : 'TECHNICIAN';

  return (
    <div className="min-h-screen bg-[#F8F6FC] text-slate-900 flex flex-col">

      {/* Top Navigation - ONLY in Desktop Admin View */}
      {!isMobileView && (
        <Navbar
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          isMobileView={isMobileView}
          onToggleMobileView={() => {
            setIsMobileView(true);
            setActiveTab('mobile_home');
          }}
          onSelectCustomer={handleSelectCustomer}
          onSelectJob={handleSelectJob}
          onRefreshDashboard={refreshDashboard}
          onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
        />
      )}

      {/* Mobile App Mode (Technician App or Manager App) or Desktop Admin Mode */}
      {isMobileView ? (
        !currentUser && !directJobIdFromUrl ? (
          <TechnicianLoginView onLoginSuccess={handleLoginSuccess} />
        ) : (
          <div className="flex flex-col bg-[#F5F3FF] min-h-[100dvh] h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-hidden select-none relative">
            {/* Desktop Mode & App Role Switcher Floating Bar */}
            {typeof window !== 'undefined' && window.innerWidth >= 768 && (
              <div className="fixed bottom-20 right-3 z-50 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole('TECHNICIAN');
                      setActiveTab('mobile_home');
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black transition cursor-pointer ${
                      !isManagerMobileApp
                        ? 'bg-[#F97316] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    👷 Tech App (Today Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole('MANAGER');
                      setActiveTab('mobile_home');
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black transition cursor-pointer ${
                      isManagerMobileApp
                        ? 'bg-[#6D28D9] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    👔 Manager App
                  </button>
                  {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileView(false);
                        setActiveTab('dashboard');
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      🖥️ Desktop
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Clean Main Content Area with safe scrolling for Android, iPhone & iPad */}
            <main className="flex-1 w-full max-w-4xl mx-auto overflow-y-auto overflow-x-hidden overscroll-contain">
              {/* For Technician App: only allow mobile_home (Today Jobs) and profile */}
              {(!isManagerMobileApp && activeTab !== 'profile') && (
                <MobileTechnicianView
                  onSelectJob={handleSelectJob}
                  initialJobId={selectedJobId}
                  initialMainTab="today"
                  currentRole="TECHNICIAN"
                  activeTechnicianId={currentUser?.role === 'TECHNICIAN' ? currentUser?.id : (localStorage.getItem('tech_preferred_id') || '')}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}

              {/* For Manager App: support Today, Tomorrow, Master Calendar, All Jobs, Profile */}
              {isManagerMobileApp && (activeTab === 'mobile_home' || activeTab === 'tomorrow_tab' || activeTab === 'dashboard') && (
                <MobileTechnicianView
                  onSelectJob={handleSelectJob}
                  initialJobId={selectedJobId}
                  initialMainTab={activeTab === 'tomorrow_tab' ? 'tomorrow' : 'today'}
                  onMainTabChange={(tab) => {
                    if (tab === 'tomorrow') setActiveTab('tomorrow_tab');
                    else if (tab === 'today') setActiveTab('mobile_home');
                  }}
                  onOpenCalendar={() => setActiveTab('calendar')}
                  currentRole="MANAGER"
                  activeTechnicianId=""
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {isManagerMobileApp && activeTab === 'calendar' && (
                <div className="pb-28 pt-2 px-2 sm:px-4">
                  <CalendarView
                    onSelectJob={handleSelectJob}
                    onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
                    currentRole="MANAGER"
                    currentTechnicianId=""
                  />
                </div>
              )}
              {isManagerMobileApp && activeTab === 'jobs' && (
                <div className="pb-28 pt-2 px-2 sm:px-4">
                  <JobsView
                    initialJobId={selectedJobId}
                    onSelectCustomer={handleSelectCustomer}
                    onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
                    currentRole="MANAGER"
                    currentTechnicianId=""
                    isMobileView={true}
                  />
                </div>
              )}
              {activeTab === 'profile' && (
                <div className="pb-28">
                  <TechnicianProfileView
                    onNavigate={setActiveTab}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                  />
                </div>
              )}
            </main>

            {/* Fixed PWA Bottom Navigation (role-aware: Tech App shows Today + Profile; Manager App shows Today, Tomorrow, Calendar, All Jobs, Profile) */}
            <MobileBottomNav
              activeTab={activeTab === 'dashboard' ? 'mobile_home' : activeTab}
              currentRole={mobileEffectiveRole}
              onTabChange={(nextTab) => {
                setSelectedJobId(null);
                setActiveTab(nextTab);
              }}
              todayJobsCount={dashboardData?.counters?.today_jobs || 0}
            />
          </div>
        )
      ) : (
        /* Desktop Mode with Sidebar */
        <div className="flex-1 flex w-full">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counters={dashboardData?.counters || {}}
            onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
            currentUser={currentUser}
            currentRole={currentRole}
            onLogout={handleLogout}
            onSwitchUser={handleSwitchUser}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {activeTab === 'dashboard' && (
              <DashboardView
                onSelectJob={handleSelectJob}
                onNavigateToTab={handleNavigateToTab}
                onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
              />
            )}
            {activeTab === 'live_monitor' && (
              <LiveMonitorView
                onSelectJob={handleSelectJob}
              />
            )}
            {activeTab === 'mobile_home' && (
              <MobileTechnicianView
                onSelectJob={handleSelectJob}
                initialJobId={selectedJobId}
                currentRole={currentRole}
                onOpenCalendar={() => setActiveTab('calendar')}
                activeTechnicianId={currentRole === 'TECHNICIAN' ? currentUser?.id : ''}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}
            {activeTab === 'customers' && (
              <CustomersView
                selectedCustomerId={selectedCustomerId}
                onSelectJob={handleSelectJob}
                onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
                currentRole={currentRole}
                currentTechnicianId={currentUser?.role === 'TECHNICIAN' ? currentUser?.id : ''}
                isMobileView={false}
              />
            )}
            {activeTab === 'reminders' && (
              <RemindersView />
            )}
            {activeTab === 'calendar' && (
              <CalendarView
                onSelectJob={handleSelectJob}
                onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
                currentRole={currentRole}
                currentTechnicianId={currentUser?.role === 'TECHNICIAN' ? currentUser?.id : ''}
              />
            )}
            {activeTab === 'jobs' && (
              <JobsView
                initialJobId={selectedJobId}
                initialStatusFilter={jobInitialStatusFilter}
                onSelectCustomer={handleSelectCustomer}
                onOpenAddCustomer={() => setShowGlobalAddCustomerModal(true)}
                currentRole={currentRole}
                currentTechnicianId={currentUser?.role === 'TECHNICIAN' ? currentUser?.id : ''}
                isMobileView={false}
              />
            )}
            {activeTab === 'push_settings' && (
              <FirebasePushSettingsView />
            )}
            {activeTab === 'import' && (
              <ExcelImportWizard
                onImportFinished={refreshDashboard}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView onSelectJob={handleSelectJob} />
            )}
            {activeTab === 'backup' && (
              <BackupDatabaseView />
            )}
            {activeTab === 'settings' && (
              <TreatmentsSettingsView
                currentRole={currentRole}
              />
            )}
            {activeTab === 'confirmations' && (
              <CustomerConfirmationPortal
                onBack={() => setActiveTab('dashboard')}
              />
            )}
          </main>
        </div>
      )}

      {/* Global Add Customer Modal Accessible from ANY Tab */}
      <CreateCustomerModal
        isOpen={showGlobalAddCustomerModal}
        onClose={() => setShowGlobalAddCustomerModal(false)}
        onCustomerCreated={(newCust) => {
          refreshDashboard();
          handleSelectCustomer(newCust.id);
        }}
      />

    </div>
  );
}
