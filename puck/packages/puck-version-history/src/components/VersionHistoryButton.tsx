import React from 'react';
import { useIntl } from 'react-intl';
import { IconButton } from '@commercetools/nimbus';
import { History } from '@commercetools/nimbus-icons';
import { useVersionHistoryContext } from '../context/VersionHistoryContext';

interface VersionHistoryButtonProps {
  disabled?: boolean;
}

/**
 * Toggles the History tab in the Puck left sidebar.
 * Reads active state from VersionHistoryContext — no onClick/isActive props needed.
 */
export const VersionHistoryButton: React.FC<VersionHistoryButtonProps> = ({
  disabled = false,
}) => {
  const intl = useIntl();
  const { isHistoryTabActive, openHistoryTab, closeHistoryTab } =
    useVersionHistoryContext();

  const handleClick = () => {
    if (isHistoryTabActive) {
      closeHistoryTab();
    } else {
      openHistoryTab();
    }
  };

  return (
    <IconButton
      aria-label={intl.formatMessage(
        isHistoryTabActive ? { id: 'VersionHistory.hideHistory' } : { id: 'VersionHistory.showHistory' }
      )}
      variant={isHistoryTabActive ? 'solid' : 'ghost'}
      onPress={handleClick}
      isDisabled={disabled}
    >
      <History />
    </IconButton>
  );
};
