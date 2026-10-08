import React, { useMemo, useState, type ReactNode } from 'react';
import { NavLink, useRouteMatch } from 'react-router-dom';
import {
  IconFileText,
  IconList,
  IconImageGeneration,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarRightCollapse,
} from '@tabler/icons-react';
import styles from './admin-layout.module.css';
import { Select, Stack, Text } from '@commercetools/nimbus';
import { useBusinessUnit } from '../../contexts/business-unit';

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

type AdminLayoutProps = {
  children: ReactNode;
};

const iconProps = { size: 16 };

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const match = useRouteMatch();
  const [collapsed, setCollapsed] = useState(false);
  const {
    businessUnits,
    showDropdown,
    isLoading,
    selectedBusinessUnitKey,
    setSelectedBusinessUnitKey,
  } = useBusinessUnit();

  const selectOptions = useMemo(
    () => businessUnits.map((bu) => ({ value: bu.key, label: bu.label })),
    [businessUnits]
  );

  const navItems: NavItem[] = [
    {
      label: 'Pages',
      path: `${match.url}/pages`,
      icon: <IconFileText {...iconProps} />,
    },
    {
      label: 'Items',
      path: `${match.url}/items`,
      icon: <IconList {...iconProps} />,
    },
    {
      label: 'Theme',
      path: `${match.url}/theme`,
      icon: <IconImageGeneration {...iconProps} />,
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <aside
          className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
        >
          <div className={styles.sidebarHeaderWrapper}>
            <div className={styles.sidebarHeader}>
              <div className={styles.appBadge}>CMS</div>
              {!collapsed && (
                <span className={styles.appTitle}>Contentools</span>
              )}
            </div>
            {!collapsed && showDropdown && !isLoading && (
              <Stack direction="column" gap="200">
                <Text fontSize="sm" fontWeight="medium">
                  Business unit
                </Text>
                <Select.Root
                  aria-label="Business unit"
                  selectedKey={selectedBusinessUnitKey}
                  onSelectionChange={(key) => {
                    if (key) setSelectedBusinessUnitKey(String(key));
                  }}
                >
                  <Select.Options items={selectOptions}>
                    {(item) => (
                      <Select.Option id={item.value}>{item.label}</Select.Option>
                    )}
                  </Select.Options>
                </Select.Root>
              </Stack>
            )}
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`}
                activeClassName={styles.navItemActive}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && (
                  <span className={styles.navLabel}>{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <button
            className={`${styles.toggleButton} ${collapsed ? styles.toggleButtonCollapsed : ''}`}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <IconLayoutSidebarRightExpand size={18} />
            ) : (
              <>
                <IconLayoutSidebarRightCollapse size={18} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;
