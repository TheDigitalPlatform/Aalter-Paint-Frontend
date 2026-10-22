import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { InsightsView } from '../components/dashboard/InsightsView';
import { OrdersView } from '../components/dashboard/OrdersView';
import { ValidationView } from '../components/dashboard/ValidationView';
import { ExceptionsView } from '../components/dashboard/ExceptionsView';
import { SettingsView } from '../components/dashboard/SettingsView';
import { RolesView } from '../components/dashboard/RolesView';
import { AuditView } from '../components/dashboard/AuditView';
import { LearningView } from '../components/dashboard/LearningView';
import { FLOW_TILES, WAITING_ORDERS_DATA, NOTIFICATIONS_DATA } from '../data/mockData';

export type ActiveModule =
  | 'overview'
  | 'insights'
  | 'orders'
  | 'validation'
  | 'exceptions'
  | 'institutions'
  | 'roles'
  | 'audit'
  | 'learning';

const FLOW_STEP_LABELS: Record<string, { nl: string; en: string }> = {
  'Received': { nl: 'Ontvangen', en: 'Received' },
  'Incorporated': { nl: 'Verwerkt door AI', en: 'Incorporated' },
  'Awaiting inspection': { nl: 'Wacht op controle', en: 'Awaiting inspection' },
  'Approved': { nl: 'Goedgekeurd', en: 'Approved' },
  'Rejected': { nl: 'Afgewezen', en: 'Rejected' },
  'Synchronized with BC': { nl: 'Gesynchroniseerd met BC', en: 'Synchronized with BC' },
};

interface HomePageProps {
  initialModule?: ActiveModule;
}

export const HomePage: React.FC<HomePageProps> = ({ initialModule = 'overview' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();

  const getModuleFromPath = (path: string): ActiveModule => {
    const p = path.toLowerCase();
    if (p.includes('/audit')) return 'audit';
    if (p.includes('/learning')) return 'learning';
    if (p.includes('/insights')) return 'insights';
    if (p.includes('/orders')) return 'orders';
    if (p.includes('/validation') || p.includes('/validatie')) return 'validation';
    if (p.includes('/exceptions') || p.includes('/uitzonderingen')) return 'exceptions';
    if (p.includes('/institutions') || p.includes('/settings') || p.includes('/instellingen')) return 'institutions';
    if (p.includes('/roles') || p.includes('/rollen')) return 'roles';
    return initialModule || 'overview';
  };

  const [activeModule, setActiveModule] = useState<ActiveModule>(() => getModuleFromPath(location.pathname));
  const [selectedOrderNr, setSelectedOrderNr] = useState<string>(() => {
    try {
      return sessionStorage.getItem('selected_order_nr') || 'AP-26-04819';
    } catch {
      return 'AP-26-04819';
    }
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications] = useState(NOTIFICATIONS_DATA);
  const [notifRead, setNotifRead] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  interface NavItem {
    id: ActiveModule;
    labelNl: string;
    labelEn: string;
    badge?: number;
    badgeBg?: string;
    badgeColor?: string;
    badgeBorder?: string;
    icon: (active: boolean) => React.ReactNode;
  }

  const flowNavItems: NavItem[] = [
    {
      id: 'overview',
      labelNl: 'Overzicht',
      labelEn: 'Overview',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      id: 'insights',
      labelNl: 'Inzichten',
      labelEn: 'Insights',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />
        </svg>
      ),
    },
    {
      id: 'orders',
      labelNl: 'Orders',
      labelEn: 'Orders',
      badge: 13,
      badgeBg: '#EBEBEB',
      badgeColor: '#242424',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
    },
    {
      id: 'validation',
      labelNl: 'Validatie',
      labelEn: 'Validation',
      badge: 6,
      badgeBg: '#E20714',
      badgeColor: '#FFFFFF',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'exceptions',
      labelNl: 'Uitzonderingen en BC-sync',
      labelEn: 'Exceptions and BC-sync',
      badge: 2,
      badgeBg: '#FCE8E8',
      badgeColor: '#A61B1B',
      badgeBorder: '1px solid #F5C2C2',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
          <path d="M12 8v5" />
          <path d="M12 16.5v.01" />
        </svg>
      ),
    },
  ];

  const manageNavItems: NavItem[] = [
    {
      id: 'institutions',
      labelNl: 'Instellingen',
      labelEn: 'Settings',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
      ),
    },
    {
      id: 'roles',
      labelNl: 'Rollen en toegang',
      labelEn: 'Roles and access',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'audit',
      labelNl: 'Audittrail',
      labelEn: 'Audit trail',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      id: 'learning',
      labelNl: 'Learning loop',
      labelEn: 'Learning loop',
      icon: (active) => (
        <svg className="i" viewBox="0 0 24 24" style={{ color: active ? '#E20714' : 'currentColor' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
  ];

  const renderNavButton = (item: NavItem) => {
    const isActive = activeModule === item.id;
    const label = language === 'NL' ? item.labelNl : item.labelEn;
    const tooltip = item.badge !== undefined ? `${label} (${item.badge})` : label;

    return (
      <button
        key={item.id}
        onClick={() => handleNav(item.id)}
        className="nav"
        title={tooltip}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          gap: sidebarCollapsed ? '0' : '9px',
          width: '100%',
          minHeight: '35px',
          height: '35px',
          padding: sidebarCollapsed ? '0' : '0 8px',
          border: 0,
          borderRadius: '6px',
          borderLeft: isActive ? '3px solid #E20714' : '3px solid transparent',
          borderRight: sidebarCollapsed ? '3px solid transparent' : 'none',
          background: isActive ? '#F5F5F5' : 'transparent',
          color: isActive ? '#E20714' : '#242424',
          textAlign: sidebarCollapsed ? 'center' : 'left',
          fontSize: '13.5px',
          fontWeight: isActive ? 600 : 500,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.15s ease, color 0.15s ease, border-left-color 0.15s ease',
          marginBottom: '1px',
          boxSizing: 'border-box',
        }}
      >
        {/* Icon container - perfectly centered */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '22px',
            height: '22px',
          }}
        >
          {item.icon(isActive)}
        </div>

        {/* Collapsed Badge Pill */}
        {sidebarCollapsed && item.badge !== undefined && (
          <span
            style={{
              position: 'absolute',
              top: '3px',
              right: '6px',
              fontSize: '9.5px',
              fontWeight: 700,
              minWidth: '15px',
              height: '15px',
              padding: '0 3.5px',
              background: item.badgeBg || '#EBEBEB',
              color: item.badgeColor || '#242424',
              borderRadius: '8px',
              border: item.badgeBorder || 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Expanded Label */}
        {!sidebarCollapsed && (
          <span
            style={{
              flexGrow: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.25,
            }}
          >
            {label}
          </span>
        )}

        {/* Expanded Badge */}
        {!sidebarCollapsed && item.badge !== undefined && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '1px 6px',
              background: item.badgeBg || '#EBEBEB',
              color: item.badgeColor || '#242424',
              borderRadius: '10px',
              border: item.badgeBorder || 'none',
              flexShrink: 0,
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Expanded Active Arrow */}
        {!sidebarCollapsed && (
          <svg
            className="s"
            viewBox="0 0 24 24"
            style={{
              color: isActive ? '#E20714' : 'transparent',
              flexShrink: 0,
              transition: 'color 0.15s ease',
            }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    );
  };

  useEffect(() => {
    const mod = getModuleFromPath(location.pathname);
    setActiveModule(mod);
  }, [location.pathname, initialModule]);

  const handleNav = (mod: ActiveModule, orderNr?: string) => {
    if (orderNr) {
      setSelectedOrderNr(orderNr);
      try {
        sessionStorage.setItem('selected_order_nr', orderNr);
      } catch { }
    }
    setActiveModule(mod);
    navigate('/' + mod);
  };

  const markAllRead = () => {
    setNotifRead(true);
    setNotifOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifRead ? 0 : notifications.length;

  const getInitials = (name?: string) => {
    if (!name) return 'BV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userName = user?.name || 'Bart Van Damme';
  const userInitials = getInitials(userName);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F5F5F5',
        color: '#242424',
        fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
        fontSize: '15px',
        lineHeight: 1.5,
      }}
    >
      {/* Main layout container (Sidebar + Content) */}
      <div style={{ display: 'flex', flexGrow: 1, minWidth: 0, width: '100%', alignItems: 'stretch' }}>
        {/* ============ LEFT SIDEBAR ============ */}
        <aside
          style={{
            flex: sidebarCollapsed ? '0 0 68px' : '0 0 236px',
            width: sidebarCollapsed ? '68px' : '236px',
            background: '#FFFFFF',
            color: '#242424',
            borderRight: '1px solid #EBEBEB',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100vh',
            position: 'sticky',
            top: 0,
            padding: sidebarCollapsed ? '10px 4px 12px 4px' : '10px 8px 12px 8px',
            boxSizing: 'border-box',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), flex-basis 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease',
            overflowX: 'hidden',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {/* Top section: Logo + Nav Modules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {/* Logo and App Title - Centered properly in both expanded and collapsed states */}
            <div
              style={{
                padding: sidebarCollapsed ? '2px 0 8px 0' : '2px 4px 8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: sidebarCollapsed ? '0px' : '4px',
                borderBottom: '1px solid #EBEBEB',
                transition: 'all 0.22s ease',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={() => handleNav('overview')}
                title="Aalterpaint"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <img
                  src="/logo.png"
                  alt="Aalterpaint"
                  style={{
                    width: sidebarCollapsed ? '34px' : '72px',
                    height: sidebarCollapsed ? '34px' : '52px',
                    display: 'block',
                    margin: '0 auto',
                    objectFit: 'contain',
                    transition: 'width 0.22s ease, height 0.22s ease',
                  }}
                />
              </button>
              {!sidebarCollapsed && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '1px',
                    paddingBottom: '2px',
                    whiteSpace: 'nowrap',
                    animation: 'apFade 0.2s ease',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '14.5px',
                      lineHeight: 1.2,
                      color: '#242424',
                      textAlign: 'center',
                    }}
                  >
                    {language === 'NL' ? 'Orderverwerking' : 'Order processing'}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: '#666666',
                      textAlign: 'center',
                    }}
                  >
                    {language === 'NL' ? 'AI-orderassistent' : 'AI order assistant'}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation Sections */}
            <nav aria-label="Modules" style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
              {/* Section: Orderstroom */}
              {!sidebarCollapsed && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#8A8A8A',
                    padding: '4px 8px 3px 8px',
                    whiteSpace: 'nowrap',
                    animation: 'apFade 0.2s ease',
                  }}
                >
                  {language === 'NL' ? 'Orderstroom' : 'Order flow'}
                </span>
              )}

              {flowNavItems.map(renderNavButton)}

              {/* Section: Beheer en opvolging */}
              {sidebarCollapsed ? (
                <div
                  aria-hidden="true"
                  style={{
                    height: '1px',
                    background: '#EBEBEB',
                    margin: '6px auto',
                    width: '32px',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#8A8A8A',
                    padding: '10px 8px 3px 8px',
                    whiteSpace: 'nowrap',
                    animation: 'apFade 0.2s ease',
                  }}
                >
                  {language === 'NL' ? 'Beheer en opvolging' : 'Management and follow-up'}
                </span>
              )}

              {manageNavItems.map(renderNavButton)}
            </nav>
          </div>

          {/* Bottom Pinned Footer: Circular Toggle Button */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
              alignItems: 'center',
              padding: sidebarCollapsed ? '8px 0 0 0' : '8px 4px 0 4px',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={toggleSidebar}
              className="sidebar-toggle-btn"
              title={
                sidebarCollapsed
                  ? (language === 'NL' ? 'Zijbalk uitklappen' : 'Expand sidebar')
                  : (language === 'NL' ? 'Zijbalk inklappen' : 'Collapse sidebar')
              }
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: '15px',
                  height: '15px',
                  stroke: '#FFFFFF',
                  strokeWidth: 2.5,
                  fill: 'none',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }}
              >
                {sidebarCollapsed ? (
                  /* Chevron pointing right when collapsed to indicate click to expand */
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  /* Chevron pointing left when expanded to indicate click to collapse */
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          </div>
        </aside>

        {/* ============ MAIN VIEW AREA ============ */}
        <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar - Sticky Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '11px 32px 11px 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid #EBEBEB',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            boxSizing: 'border-box',
            minHeight: '62px',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#4D4D4D', whiteSpace: 'nowrap', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => handleNav('overview')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 0,
                color: '#4D4D4D',
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                lineHeight: 'inherit',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E20714')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4D4D4D')}
            >
              Aalterpaint
            </button>
            <span aria-hidden="true" style={{ color: '#9A9A9A' }}>/</span>
            <span style={{ color: '#1A1A1A', fontWeight: 600 }}>
              {activeModule === 'insights'
                ? 'Insights'
                : activeModule === 'orders'
                  ? 'Orders'
                  : activeModule === 'validation'
                    ? (language === 'NL' ? 'Validatie' : 'Validation')
                    : activeModule === 'exceptions'
                      ? (language === 'NL' ? 'Uitzonderingen en BC-sync' : 'Exceptions and BC-sync')
                      : activeModule === 'institutions'
                        ? (language === 'NL' ? 'Instellingen' : 'Settings')
                        : activeModule === 'roles'
                          ? (language === 'NL' ? 'Rollen en toegang' : 'Roles and access')
                          : activeModule === 'audit'
                            ? (language === 'NL' ? 'Audittrail' : 'Audit trail')
                            : activeModule === 'learning'
                              ? 'Learning loop'
                              : (language === 'NL' ? 'Overzicht' : 'Overview')}
            </span>
          </div>

          {/* Right Header Action Controls: Language Toggle, Notifications, Profile (Shifted left comfortably away from the scrollbar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginRight: '22px' }}>
            {/* Language Toggle UI (EN / NL) */}
            <LanguageToggle language={language} onChange={setLanguage} />

            {/* Notifications Icon Button */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
              className="bg"
              style={{
                position: 'relative',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFFFFF',
                border: '1px solid #DADADA',
                borderRadius: '6px',
                color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              <svg className="i" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="a-pop"
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    background: '#E20714',
                    color: '#FFFFFF',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Avatar with Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="User Profile"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#242424',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  border: 0,
                  cursor: 'pointer',
                }}
              >
                {userInitials}
              </button>

              {userDropdownOpen && (
                <div
                  className="a-drop"
                  style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    width: '220px',
                    background: '#FFFFFF',
                    border: '1px solid #DADADA',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    zIndex: 1100,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #EBEBEB' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>{userName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B6B6B' }}>{user?.email || 'authenticated'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="row"
                    style={{
                      padding: '10px 14px',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#E20714',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Dropdown Dialog */}
          {notifOpen && (
            <div
              className="a-drop"
              role="dialog"
              aria-label="Notifications"
              style={{
                position: 'absolute',
                top: '52px',
                right: '24px',
                width: '380px',
                maxWidth: 'calc(100% - 48px)',
                background: '#FFFFFF',
                border: '1px solid #DADADA',
                borderRadius: 0,
                overflow: 'hidden',
                boxShadow: '0 18px 48px rgba(18,18,18,0.14)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px 16px',
                  borderBottom: '1px solid #DADADA',
                }}
              >
                <span style={{ fontFamily: "'Archivo', system-ui, sans-serif", fontWeight: 700, fontSize: '16px' }}>
                  {language === 'NL' ? 'Meldingen' : 'Notifications'}
                </span>
                <button
                  className="bg"
                  onClick={markAllRead}
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: '6px 8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#242424',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {language === 'NL' ? 'Alles als gelezen markeren' : 'Mark all read'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    className="row"
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      padding: '12px 16px',
                      border: 0,
                      borderBottom: '1px solid #EBEBEB',
                      background: '#FFFFFF',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        marginTop: '7px',
                        background: n.color,
                        borderRadius: '50%',
                        flex: 'none',
                      }}
                    />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>{n.title}</span>
                      <span style={{ fontSize: '13px', color: '#4D4D4D' }}>{n.sub}</span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#6B6B6B',
                      }}
                    >
                      {n.time}
                    </span>
                  </button>
                ))}
              </div>
              <div
                onClick={() => {
                  setNotifOpen(false);
                  handleNav('institutions');
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  color: '#6B6B6B',
                  cursor: 'pointer',
                  borderTop: '1px solid #EBEBEB',
                }}
              >
                {language === 'NL'
                  ? 'Meldingskanalen stel je in onder Instellingen.'
                  : 'Notification channels can be configured under Settings.'}
              </div>
            </div>
          )}
        </header>

        {/* Main Body */}
        <main
          style={{
            padding: '24px 28px 48px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            minWidth: 0,
            maxWidth: '1480px',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {activeModule === 'insights' ? (
            <InsightsView
              language={language}
              onNavigateToOrders={() => handleNav('orders')}
              onNavigateToExceptions={() => handleNav('exceptions')}
              onNavigateToLearning={() => handleNav('learning')}
            />
          ) : activeModule === 'orders' ? (
            <OrdersView
              language={language}
              onOpenOrder={(nr) => handleNav('validation', nr)}
              onNavigateToExceptions={() => handleNav('exceptions')}
            />
          ) : activeModule === 'validation' ? (
            <ValidationView
              language={language}
              selectedOrderNr={selectedOrderNr}
              userName={userName}
              onNavigateToOrders={() => handleNav('orders')}
              onNavigateToExceptions={() => handleNav('exceptions')}
            />
          ) : activeModule === 'exceptions' ? (
            <ExceptionsView
              language={language}
              userName={userName}
              onOpenOrder={(nr) => handleNav('validation', nr)}
              onNavigateToOrders={() => handleNav('orders')}
            />
          ) : activeModule === 'institutions' ? (
            <SettingsView
              language={language}
              userName={userName}
            />
          ) : activeModule === 'roles' ? (
            <RolesView
              language={language}
              currentUserId="u1"
            />
          ) : activeModule === 'audit' ? (
            <AuditView
              language={language}
            />
          ) : activeModule === 'learning' ? (
            <LearningView
              language={language}
            />
          ) : (
            <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Top Action Header */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '32px',
                      lineHeight: 1.15,
                      color: '#1A1A1A',
                    }}
                  >
                    {language === 'NL' ? 'Overzicht' : 'Overview'}
                  </h1>
                  <p style={{ margin: 0, color: '#4D4D4D' }}>
                    {language === 'NL'
                      ? 'De bestellingen van vandaag, van mailbox tot Business Central. Elke order wordt gecontroleerd door een medewerker.'
                      : "Today's orders, from mailbox to Business Central. Every order is approved by an employee."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleNav('insights')}
                    className="bg"
                    style={{
                      minHeight: '44px',
                      padding: '0 16px',
                      border: '1px solid #1A1A1A',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'NL' ? 'ALLE INZICHTEN' : 'ALL INSIGHTS'}
                    <svg className="s" viewBox="0 0 24 24" style={{ color: '#E20714' }}>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleNav('validation', 'AP-26-04819')}
                    className="bp"
                    style={{
                      minHeight: '44px',
                      padding: '0 18px',
                      background: '#E20714',
                      color: '#FFFFFF',
                      border: 0,
                      borderRadius: 0,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'NL' ? 'START VALIDATIE ( 6 )' : 'START VALIDATION ( 6 )'}
                    <svg className="s" viewBox="0 0 24 24">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Orders today KPI Flow Card */}
              <section
                aria-label={language === 'NL' ? 'Orders vandaag' : 'Orders today'}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DADADA',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px 10px',
                    padding: '14px 20px',
                    borderBottom: '1px solid #DADADA',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#1A1A1A',
                    }}
                  >
                    {language === 'NL' ? 'Orders vandaag' : 'Orders today'}
                  </h2>
                  <span style={{ fontSize: '12px', color: '#6B6B6B', marginLeft: 'auto' }}>
                    {language === 'NL'
                      ? 'In de volgorde van de stroom · voorbeelddata'
                      : 'In the order of the flow · example data'}
                  </span>
                </div>

                {/* 2-Column Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
                    columnGap: '32px',
                    padding: '4px 20px 8px 20px',
                  }}
                >
                  {FLOW_TILES.map((k) => (
                    <button
                      key={k.nr}
                      onClick={() => handleNav('orders')}
                      className="a-stag row"
                      title={`${k.step} · ${k.who} · ${k.sub}`}
                      style={{
                        animationDelay: `${k.d}ms`,
                        display: 'grid',
                        gridTemplateColumns: '22px minmax(0, 1fr) minmax(60px, 0.8fr) 30px',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '9px 0',
                        background: 'transparent',
                        border: 0,
                        borderBottom: '1px solid #EBEBEB',
                        textAlign: 'left',
                        color: '#1A1A1A',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Archivo', system-ui, sans-serif",
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#E20714',
                        }}
                      >
                        {k.nr}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {FLOW_STEP_LABELS[k.label]
                          ? (language === 'NL' ? FLOW_STEP_LABELS[k.label].nl : FLOW_STEP_LABELS[k.label].en)
                          : k.label}
                      </span>
                      <span style={{ display: 'block', height: '4px', background: '#F2F2F2' }}>
                        <span
                          className="a-barx"
                          style={{
                            animationDelay: `${k.bd}ms`,
                            display: 'block',
                            height: '4px',
                            width: `${k.w}%`,
                            background: k.barColor,
                          }}
                        />
                      </span>
                      <span
                        style={{
                          fontFamily: "'Archivo', system-ui, sans-serif",
                          fontWeight: 700,
                          fontSize: '16px',
                          lineHeight: 1,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {k.shown}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Waiting for you Card */}
              <section
                aria-label={language === 'NL' ? 'Wachten op u' : 'Waiting for you'}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DADADA',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px 10px',
                    padding: '14px 20px',
                    borderBottom: '1px solid #DADADA',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Archivo', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#1A1A1A',
                    }}
                  >
                    {language === 'NL' ? 'Wachten op u' : 'Waiting for you'}
                  </h2>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '1px 8px',
                      background: '#E20714',
                      color: '#FFFFFF',
                      borderRadius: '2px',
                    }}
                  >
                    6
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B6B6B', marginLeft: 'auto' }}>
                    {language === 'NL'
                      ? 'Eerst extra aandacht, dan de langst wachtende'
                      : 'Extra attention first, then the longest waiting'}
                  </span>
                </div>

                {/* Waiting List Rows */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {WAITING_ORDERS_DATA.map((o) => (
                    <div
                      key={o.nr}
                      className="a-stag"
                      style={{
                        animationDelay: `${o.d}ms`,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '10px 16px',
                        padding: '14px 20px',
                        borderBottom: '1px solid #EBEBEB',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 220px', minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            {o.nr}
                          </span>
                          <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{o.klant}</span>
                        </span>
                        <span style={{ fontSize: '13px', color: '#4D4D4D' }}>{o.firstWhy}</span>
                      </div>

                      <ConfidenceBadge value={o.avg} threshold={70} />

                      <span
                        style={{
                          fontSize: '13px',
                          color: o.waitColor,
                          fontWeight: 600,
                          minWidth: '64px',
                        }}
                      >
                        {o.waitTxt}
                      </span>

                      <button
                        onClick={() => handleNav('validation', o.nr)}
                        className="bd"
                        style={{
                          minHeight: '40px',
                          padding: '0 14px',
                          background: '#FFFFFF',
                          color: '#E20714',
                          border: '1px solid #E20714',
                          borderRadius: 0,
                          fontWeight: 700,
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          cursor: 'pointer',
                        }}
                      >
                        {language === 'NL' ? 'VALIDEREN' : 'VALIDATE'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Lock Warning Footer */}
                <div
                  style={{
                    padding: '12px 20px',
                    fontSize: '13px',
                    color: '#4D4D4D',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <svg className="s" viewBox="0 0 24 24">
                    <rect x="4" y="11" width="16" height="10" rx="1" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  {language === 'NL'
                    ? 'Er gaat niets automatisch naar Business Central.'
                    : 'Nothing goes automatically to Business Central.'}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
      </div>
    </div>
  );
};
