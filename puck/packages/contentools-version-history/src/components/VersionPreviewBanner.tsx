import React from 'react';
import { useIntl } from 'react-intl';
import { Badge, Button, Icon, Stack } from '@commercetools/nimbus';
import { AccessTime } from '@commercetools/nimbus-icons';

interface VersionPreviewBannerProps {
  timestamp: string;
  onApply: () => void;
  onDiscard: () => void;
  isApplying?: boolean;
}

/**
 * Replaces the normal editor toolbar when previewing a historical version.
 * Shows the version timestamp, an "Apply" button, and a "Discard" button.
 * The normal Save / Publish / Revert to Published buttons must NOT be
 * rendered alongside this component.
 */
export const VersionPreviewBanner: React.FC<VersionPreviewBannerProps> = ({
  timestamp,
  onApply,
  onDiscard,
  isApplying = false,
}) => {
  const intl = useIntl();
  const formatted = new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Stack direction="row" gap="200" alignItems="center">
      {/* Version label */}
      <Badge colorPalette="info">
        <Icon as={AccessTime} size="xs" />
        {intl.formatMessage({ id: 'VersionHistory.previewingVersion' }, { timestamp: formatted })}
      </Badge>

      {/* Apply version button */}
      <Button variant="solid" onPress={onApply} isDisabled={isApplying}>
        {intl.formatMessage(isApplying ? { id: 'VersionHistory.applying' } : { id: 'VersionHistory.applyThisVersion' })}
      </Button>

      {/* Discard / back to current */}
      <Button variant="outline" onPress={onDiscard} isDisabled={isApplying}>
        {intl.formatMessage({ id: 'VersionHistory.backToCurrent' })}
      </Button>
    </Stack>
  );
};
