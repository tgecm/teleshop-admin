import React from 'react';

export default function LoadingSkeleton({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}
