/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NavLink, useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Description,
  ListAlt,
  Palette,
  ChevronLeft,
  ChevronRight,
} from '@commercetools/nimbus-icons';
import styles from './admin-layout.module.css';
import { Select, Stack, Text } from '@commercetools/nimbus';
import { useBusinessUnit } from '../../contexts/business-unit';
import messages from '../../i18n/messages';

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const match = useRouteMatch();
  const intl = useIntl();
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
      label: intl.formatMessage(messages.pages),
      path: `${match.url}/pages`,
      icon: <Description />,
    },
    {
      label: intl.formatMessage(messages.items),
      path: `${match.url}/items`,
      icon: <ListAlt />,
    },
    {
      label: intl.formatMessage(messages.theme),
      path: `${match.url}/theme`,
      icon: <Palette />,
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <aside
          className={`${styles.sidebar} ${
            collapsed ? styles.sidebarCollapsed : ''
          }`}
        >
          <div className={styles.sidebarHeaderWrapper}>
            <div className={styles.sidebarHeader}>
              <div className={styles.appBadge}>CT</div>
              {!collapsed && (
                <span className={styles.appTitle}>Contentools</span>
              )}
            </div>
            {!collapsed && showDropdown && !isLoading && (
              <Stack direction="column" gap="200">
                <Text fontSize="sm" fontWeight="medium">
                  {intl.formatMessage(messages.businessUnit)}
                </Text>
                <Select.Root
                  aria-label={intl.formatMessage(messages.businessUnit)}
                  selectedKey={selectedBusinessUnitKey}
                  onSelectionChange={(key) => {
                    if (key) setSelectedBusinessUnitKey(String(key));
                  }}
                >
                  <Select.Options items={selectOptions}>
                    {(item) => (
                      <Select.Option id={item.value}>
                        {item.label}
                      </Select.Option>
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
                className={`${styles.navItem} ${
                  collapsed ? styles.navItemCollapsed : ''
                }`}
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
            className={`${styles.toggleButton} ${
              collapsed ? styles.toggleButtonCollapsed : ''
            }`}
            onClick={() => setCollapsed((c) => !c)}
            title={intl.formatMessage(
              collapsed ? messages.expandTitle : messages.collapseTitle
            )}
          >
            {collapsed ? (
              <ChevronRight />
            ) : (
              <>
                <ChevronLeft />
                <span>{intl.formatMessage(messages.collapse)}</span>
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
