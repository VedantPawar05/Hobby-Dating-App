import React from 'react';
import { Compass } from 'lucide-react';
import Button from './Button.js';

export function EmptyState({
  icon: Icon = Compass,
  title = 'No activities found',
  description = 'Try adjusting your search filters or check back later for newly published events.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      <div className="p-3.5 bg-surface-100 text-surface-500 rounded-2xl mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-600 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
