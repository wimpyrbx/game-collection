import { useState } from 'react';
import { Switch } from '../ui';
import { getMiniature } from '../../services/miniatureService';
import { AuditService } from '../../services/auditService';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

interface OptimisticSwitchProps {
  checked: boolean;
  miniId: number;
  onUpdate: (miniId: number, checked: boolean) => Promise<void>;
  className?: string;
}

export function OptimisticSwitch({ checked, miniId, onUpdate, className }: OptimisticSwitchProps) {
  const [optimisticChecked, setOptimisticChecked] = useState(checked);
  const { showError } = useNotifications();
  const { user } = useAuth();

  const handleChange = async (newChecked: boolean) => {
    try {
      // Optimistically update UI
      setOptimisticChecked(newChecked);

      // Get the old state for audit log
      const oldMiniature = await getMiniature(miniId);

      // Perform actual update
      await onUpdate(miniId, newChecked);

      // Log the update if there's a user
      if (user?.id && oldMiniature) {
        const newMiniature = await getMiniature(miniId);
        if (newMiniature) {
          await AuditService.logMiniatureUpdate(
            user.id,
            miniId,
            oldMiniature,
            newMiniature
          );
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticChecked(!newChecked);
      console.error('Error updating in_use status:', error);
      showError('Failed to update status');
    }
  };

  return (
    <Switch
      checked={optimisticChecked}
      onChange={handleChange}
      className={className}
    />
  );
} 