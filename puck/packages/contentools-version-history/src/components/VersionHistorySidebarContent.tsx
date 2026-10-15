import React from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { useVersionHistoryContext } from '../context/VersionHistoryContext';
import { VersionCard } from './VersionCard';
import { DiffSummary } from './DiffSummary';
import { Button, LoadingSpinner, Stack, Text } from '@commercetools/nimbus';

/**
 * Inline version history panel for Puck's left sidebar.
 * Reads all state from VersionHistoryContext — no props needed.
 */
export const VersionHistorySidebarContent: React.FC = () => {
  const intl = useIntl();
  const {
    versions,
    isLoadingVersions,
    selectedVersionId,
    isPreviewingHistory,
    isApplying,
    diff,
    onVersionSelect,
    onApply,
    onDiscard,
  } = useVersionHistoryContext();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable version list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {isLoadingVersions ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <LoadingSpinner />
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: '12px 0' }}>
            <Text color="neutral.11">
              <FormattedMessage id="VersionHistory.noSavedVersions" />
            </Text>
          </div>
        ) : (
          <Stack direction="column" gap="200">
            <Text fontSize="sm" fontWeight="700">
              <FormattedMessage id="VersionHistory.savedVersions" />
            </Text>
            {versions.map((v, i) => (
              <VersionCard
                key={v.id}
                version={v}
                isSelected={selectedVersionId === v.id}
                isCurrent={i === 0}
                onClick={onVersionSelect}
              />
            ))}
          </Stack>
        )}

        {/* Diff summary when a version is selected */}
        {diff && selectedVersionId && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--puck-color-grey-04, #e5e7eb)',
            }}
          >
            <DiffSummary diff={diff} />
          </div>
        )}
      </div>

      {/* Apply / Discard footer — visible only when previewing a version */}
      {isPreviewingHistory && (
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid var(--puck-color-grey-04, #e5e7eb)',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" gap="200" justifyContent="space-between">
            <Button
              variant="solid"
              size="sm"
              onPress={onApply}
              isDisabled={isApplying}
            >
              {intl.formatMessage(isApplying ? { id: 'VersionHistory.applying' } : { id: 'VersionHistory.apply' })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={onDiscard}
              isDisabled={isApplying}
            >
              <FormattedMessage id="VersionHistory.revert" />
            </Button>
          </Stack>
        </div>
      )}
    </div>
  );
};
