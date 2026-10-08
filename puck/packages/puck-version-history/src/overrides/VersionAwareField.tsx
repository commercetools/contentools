import React from 'react';
import { FormattedMessage } from 'react-intl';
import { usePuck } from '@measured/puck';
import { useVersionHistoryContext } from '../context/VersionHistoryContext';
import { Badge, Stack, Text } from '@commercetools/nimbus';

interface VersionAwareFieldsPanelProps {
  children: React.ReactNode;
  isLoading: boolean;
}

/**
 * Puck `fields` override that injects a "Changed props" banner above the
 * fields panel whenever the editor is in version-preview mode and the
 * currently selected component has properties that differ from the current draft.
 *
 * Usage:
 *   overrides={{ fields: VersionAwareFieldsPanel }}
 */
export const VersionAwareFieldsPanel: React.FC<VersionAwareFieldsPanelProps> = ({
  children,
}) => {
  const { diff, isPreviewingHistory } = useVersionHistoryContext();
  const { appState } = usePuck();

  if (!isPreviewingHistory || !diff) {
    return <>{children}</>;
  }

  const itemSelector = appState.ui.itemSelector;
  const selectedItem =
    itemSelector != null ? appState.data.content[itemSelector.index] : null;

  const componentDiff = selectedItem
    ? diff.components.find(
        (c) =>
          c.id === (selectedItem.props.id as string) && c.status === 'changed'
      )
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Changed-props banner — only rendered when there are differences */}
      {componentDiff && componentDiff.changedProps.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            background: 'rgba(245, 158, 11, 0.07)',
          }}
        >
          <Stack direction="column" gap="100">
            <Text fontSize="sm" fontWeight="700">
              <FormattedMessage id="VersionHistory.fieldsChanged" />
            </Text>
            <Stack direction="row" gap="100" wrap="wrap">
              {componentDiff.changedProps
                // hide internal puck `id` prop
                .filter((p) => p !== 'id')
                .map((prop) => (
                  <Badge key={prop} colorPalette="neutral" size="xs">{prop}</Badge>
                ))}
            </Stack>
          </Stack>
        </div>
      )}

      {/* Root-level changes indicator when no component is selected */}
      {!selectedItem && diff.rootChanges.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            background: 'rgba(245, 158, 11, 0.07)',
          }}
        >
          <Stack direction="column" gap="100">
            <Text fontSize="sm" fontWeight="700">
              <FormattedMessage id="VersionHistory.rootFieldsChanged" />
            </Text>
            <Stack direction="row" gap="100" wrap="wrap">
              {diff.rootChanges.map((prop) => (
                <Badge key={prop} colorPalette="neutral" size="xs">{prop}</Badge>
              ))}
            </Stack>
          </Stack>
        </div>
      )}

      {children}
    </div>
  );
};
