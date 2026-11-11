'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../common/Button.js';

export function PaginationBar({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-surface-100">
      <p className="text-xs text-slate-500">
        Page <span className="font-semibold text-surface-800">{pagination.page}</span> of{' '}
        <span className="font-semibold text-surface-800">{pagination.totalPages}</span> (
        {pagination.total} total)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default PaginationBar;

