import React from 'react';
import { FormattedMessage } from 'react-intl';
import type { VersionEntry } from '../types';
import { Badge, Button, Text } from '@commercetools/nimbus';

interface VersionCardProps {
  version: VersionEntry;
  isSelected: boolean;
  isCurrent?: boolean;
  onClick: (id: string) => void;
}

/**
 * Renders a single version entry as a selectable card showing the timestamp.
 */
export const VersionCard: React.FC<VersionCardProps> = ({
  version,
  isSelected,
  isCurrent = false,
  onClick,
}) => {
  const formatted = new Date(version.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Button
      variant={isSelected ? 'outline' : 'ghost'}
      colorPalette={isSelected ? 'primary' : 'neutral'}
      onPress={() => onClick(version.id)}
      width="100%"
      justifyContent="space-between"
      px="300"
    >
      <Text fontSize="sm" fontWeight={isSelected ? '700' : '400'}>
        {formatted}
      </Text>
      {isCurrent && (
        <Badge colorPalette="positive" size="2xs">
          <FormattedMessage id="VersionHistory.currentBadge" />
        </Badge>
      )}
    </Button>
  );
};
