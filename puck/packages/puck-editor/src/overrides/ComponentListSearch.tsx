import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePuck } from '@measured/puck';
import { useIntl } from 'react-intl';
import { IconButton, TextInput } from '@commercetools/nimbus';
import { Close } from '@commercetools/nimbus-icons';
import {
  useVersionHistoryContext,
  VersionHistorySidebarContent,
} from '@commercetools-demo/puck-version-history';

// ---------------------------------------------------------------------------
// Component search context
// ---------------------------------------------------------------------------

interface ComponentSearchContextValue {
  search: string;
  setSearch: (value: string) => void;
}

export const ComponentSearchContext = createContext<ComponentSearchContextValue>({
  search: '',
  setSearch: () => {},
});

export const ComponentSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [search, setSearch] = useState('');
  return (
    <ComponentSearchContext.Provider value={{ search, setSearch }}>
      {children}
    </ComponentSearchContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Tab button — matches Puck's own Inspector/Outline tab style
// ---------------------------------------------------------------------------

const SidebarTab: React.FC<{
  label: string;
  ariaLabel: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, ariaLabel, isActive, onClick }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={isActive}
    title={ariaLabel}
    onClick={onClick}
    style={{
      flex: 1,
      padding: '8px 12px',
      border: 'none',
      borderBottom: isActive
        ? '2px solid var(--puck-color-azure-07, #1a73e8)'
        : '2px solid transparent',
      background: 'none',
      cursor: 'pointer',
      fontSize: '0.775rem',
      fontWeight: isActive ? 700 : 500,
      color: isActive
        ? 'var(--puck-color-azure-07, #1a73e8)'
        : 'var(--puck-color-grey-07, #374151)',
      transition: 'color 0.12s, border-color 0.12s',
    }}
  >
    {label}
  </button>
);

// Remap the `expanded` flag of every category in Puck's componentList UI state.
const remapExpanded = (
  componentList: Record<string, { expanded?: boolean }> | undefined,
  next: (key: string, current: boolean) => boolean
): Record<string, { expanded?: boolean }> =>
  Object.fromEntries(
    Object.entries(componentList ?? {}).map(([key, value]) => [
      key,
      { ...value, expanded: next(key, !!value.expanded) },
    ])
  );

// ---------------------------------------------------------------------------
// ComponentsPanel override — tabs: "Components" | "History"
//
// CSS trick: Puck's Drawer renders each item as a direct `div` child of the
// `[data-puck-dnd]` container (flex, gap:12px). When an item is hidden we
// inject a `data-hidden-component` span; the `:has()` rule sets that wrapper
// to `display:none` so it's removed from the flex flow entirely.
// ---------------------------------------------------------------------------

export const ComponentsPanel: React.FC<{ children: ReactNode }> = ({ children }) => {
  const intl = useIntl();
  const { search, setSearch } = useContext(ComponentSearchContext);
  const { isHistoryTabActive, openHistoryTab, closeHistoryTab } = useVersionHistoryContext();
  const { dispatch, appState } = usePuck();
  const componentsLabel = intl.formatMessage({ id: 'Editor.tabComponents' });
  const historyLabel = intl.formatMessage({ id: 'Editor.tabHistory' });

  // Categories start collapsed for a tidy panel, but a search must never hide a
  // match inside a collapsed group — so expand everything while searching and
  // restore the author's prior expansion when the search is cleared.
  const searching = search.trim() !== '';
  const expansionSnapshot = useRef<Record<string, boolean> | null>(null);

  useEffect(() => {
    const componentList = (appState?.ui?.componentList ?? {}) as Record<
      string,
      { expanded?: boolean }
    >;
    if (searching) {
      if (expansionSnapshot.current === null) {
        expansionSnapshot.current = Object.fromEntries(
          Object.entries(componentList).map(([k, v]) => [k, !!v.expanded])
        );
        dispatch({
          type: 'setUi',
          ui: (prev) => ({
            componentList: remapExpanded(prev.componentList, () => true),
          }),
        });
      }
    } else if (expansionSnapshot.current) {
      const snap = expansionSnapshot.current;
      dispatch({
        type: 'setUi',
        ui: (prev) => ({
          componentList: remapExpanded(
            prev.componentList,
            (key, current) => snap[key] ?? current
          ),
        }),
      });
      expansionSnapshot.current = null;
    }
    // Only react to the search on/off transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Remove hidden DrawerItem wrappers from the flex layout, tighten the
          vertical padding on each draggable component, and trim the wide
          horizontal padding around the canvas so it gets more width.
          `PuckCanvas_` (underscore) matches only the outer canvas element, not
          its `PuckCanvas-*` children. */}
      <style>{`
        [data-puck-dnd] > div:has([data-hidden-component]) { display: none !important; }
        [class*="DrawerItem-draggable"] { padding-top: 6px !important; padding-bottom: 6px !important; }
        [class*="PuckCanvas_"] { padding-left: 4px !important; padding-right: 4px !important; }
        /* Make Puck fill its embedding container instead of 100dvh (which
           overflows below the app's nav bars and hides the sidebars' scroll).
           Puck nests an unclassed wrapper + .PuckLayout between .Puck and the
           layout grid, all height:auto — so they collapse to 0 and a plain
           height:100% on the grid has nothing to resolve against. Give every
           link in that chain an explicit height so the grid can fill
           .puck-editor-fill while staying in NORMAL FLOW.
           Do NOT position the grid absolutely: an earlier 'position:absolute;
           inset:0' approach filled the container but broke @dnd-kit's
           pointer/collision tracking, so dragging components from the panel
           into the canvas stopped working (no drop target, no placement
           preview). '> div:not([class])' targets only the unclassed layout
           wrapper, never its sibling _Puck-portal_ (which must keep height:0).
           Scoped to .puck-editor-fill so standalone usage keeps 100dvh. */
        .puck-editor-fill { position: relative; }
        .puck-editor-fill > .Puck,
        .puck-editor-fill > .Puck > div:not([class]),
        .puck-editor-fill [class*="PuckLayout_"] { height: 100%; }
        .puck-editor-fill [class*="PuckLayout-inner"] { height: 100% !important; }
        /* Resizable sidebars: override the affected grid track(s) with a
           user-controlled width var — --puck-components-width for the left
           (set by ComponentsResizer) and --puck-properties-width for the right
           (set by PropertiesResizer) — each falling back to Puck's default
           sidebar width. One rule per visible-panel combination. */
        .puck-editor-fill [class*="PuckLayout--leftSideBarVisible"][class*="PuckLayout--rightSideBarVisible"] [class*="PuckLayout-inner"] {
          grid-template-columns: var(--puck-components-width, var(--puck-side-bar-width)) var(--puck-frame-width) var(--puck-properties-width, var(--puck-side-bar-width)) !important;
        }
        .puck-editor-fill [class*="PuckLayout--leftSideBarVisible"]:not([class*="PuckLayout--rightSideBarVisible"]) [class*="PuckLayout-inner"] {
          grid-template-columns: var(--puck-components-width, var(--puck-side-bar-width)) var(--puck-frame-width) 0 !important;
        }
        .puck-editor-fill [class*="PuckLayout--rightSideBarVisible"]:not([class*="PuckLayout--leftSideBarVisible"]) [class*="PuckLayout-inner"] {
          grid-template-columns: 0 var(--puck-frame-width) var(--puck-properties-width, var(--puck-side-bar-width)) !important;
        }
        /* Drag handle: a thin divider centered on the panel's inner edge. */
        .puck-panel-resizer::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 3px;
          width: 1px;
          background: var(--puck-color-grey-09, #e2e2e2);
          transition: background-color 0.12s, width 0.12s, left 0.12s;
        }
        .puck-panel-resizer:hover::before,
        .puck-panel-resizer:active::before {
          left: 2px;
          width: 3px;
          background: var(--puck-color-azure-07, #1a73e8);
        }
      `}</style>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--puck-color-grey-04, #e5e7eb)',
          flexShrink: 0,
        }}
      >
        <SidebarTab
          label={componentsLabel}
          ariaLabel={intl.formatMessage({ id: 'Editor.showPanel' }, {
            panel: componentsLabel.toLowerCase(),
          })}
          isActive={!isHistoryTabActive}
          onClick={closeHistoryTab}
        />
        <SidebarTab
          label={historyLabel}
          ariaLabel={intl.formatMessage({ id: 'Editor.showPanel' }, {
            panel: historyLabel.toLowerCase(),
          })}
          isActive={isHistoryTabActive}
          onClick={openHistoryTab}
        />
      </div>

      {isHistoryTabActive ? (
        /* History tab content */
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          <VersionHistorySidebarContent />
        </div>
      ) : (
        /* Components tab content */
        <>
          {/* Sticky search bar */}
          <div
            style={{
              flexShrink: 0,
              padding: '0',
              margin: '12px 0',
              background: 'var(--puck-color-white, #fff)',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <label
              htmlFor="puck-component-search"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {intl.formatMessage({ id: 'Editor.searchComponents' })}
            </label>
            <TextInput
              id="puck-component-search"
              placeholder={intl.formatMessage({ id: 'Editor.searchComponentsPlaceholder' })}
              value={search}
              onChange={(value) => setSearch(value)}
              width="100%"
              trailingElement={
                search !== '' ? (
                  <IconButton
                    aria-label={intl.formatMessage({ id: 'Editor.clearSearch' })}
                    variant="ghost"
                    colorPalette="neutral"
                    size="2xs"
                    onPress={() => setSearch('')}
                  >
                    <Close />
                  </IconButton>
                ) : undefined
              }
            />
          </div>

          {/* Scrollable component list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ComponentItemFilter — hides non-matching items when searching
// ---------------------------------------------------------------------------

export const ComponentItemFilter: React.FC<{ children: ReactNode; name: string }> = ({
  children,
  name,
}) => {
  const { search } = useContext(ComponentSearchContext);
  const isHidden = search.trim() !== '' && !name.toLowerCase().includes(search.toLowerCase());

  if (isHidden) {
    return <span data-hidden-component />;
  }
  return <>{children}</>;
};
