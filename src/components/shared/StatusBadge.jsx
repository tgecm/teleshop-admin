import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    confirmed: 'bg-blue-50 text-blue-600 border-blue-100',
    processing: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    shipped: 'bg-purple-50 text-purple-600 border-purple-100',
    delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-100',
    rejected: 'bg-gray-50 text-gray-600 border-gray-100',
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    inactive: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border",
      colors[status?.toLowerCase()] || colors.inactive
    )}>
      {status}
    </span>
  );
}
