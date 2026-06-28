import React from 'react';
import { motion } from 'motion/react';

function Pulse({ className }) {
  return (
    <div className={`animate-pulse bg-gray-200/80 rounded-lg ${className}`} />
  );
}

/** Dashboard skeleton: stat cards row + chart area + tables */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <Pulse className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl" />
              <Pulse className="h-3 w-16" />
            </div>
            <Pulse className="h-7 w-24 mb-1.5" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Pulse className="h-5 w-28" />
          <Pulse className="h-8 w-24 rounded-lg" />
        </div>
        <Pulse className="h-48 md:h-64 w-full" />
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Pulse className="h-5 w-24" />
          <Pulse className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Pulse className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Pulse className="h-4 w-3/5" />
                <Pulse className="h-3 w-2/5" />
              </div>
              <Pulse className="h-5 w-16 rounded-full" />
              <Pulse className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** List page skeleton: filters/search bar + table/card list */
export function ListSkeleton({ rows = 8, filters = false }) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-32" />
        <Pulse className="h-9 w-28 rounded-lg" />
      </div>

      {/* Search / Filters */}
      {filters && (
        <div className="flex items-center gap-3">
          <Pulse className="h-10 flex-1 rounded-lg" />
          <Pulse className="h-10 w-10 rounded-lg" />
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 md:p-5 flex items-center gap-4">
            <Pulse className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Pulse className="h-4 w-2/5" />
              <Pulse className="h-3 w-3/5" />
            </div>
            <Pulse className="h-5 w-16 rounded-full hidden sm:block" />
            <Pulse className="h-4 w-20 hidden md:block" />
            <Pulse className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chat list skeleton */
export function ChatsSkeleton() {
  return (
    <div className="space-y-4">
      <Pulse className="h-7 w-28" />
      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <Pulse className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <Pulse className="h-4 w-28" />
                <Pulse className="h-3 w-12" />
              </div>
              <Pulse className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Product grid skeleton */
export function ProductsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-36" />
        <Pulse className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Pulse className="h-36 md:h-44 w-full rounded-none" />
            <div className="p-3 md:p-4 space-y-2">
              <Pulse className="h-4 w-4/5" />
              <Pulse className="h-3 w-3/5" />
              <div className="flex items-center justify-between pt-1">
                <Pulse className="h-5 w-16" />
                <Pulse className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings / form skeleton */
export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Pulse className="h-7 w-36" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-3">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-10 w-full rounded-lg" />
          <Pulse className="h-3 w-3/5" />
        </div>
      ))}
      <Pulse className="h-10 w-32 rounded-lg" />
    </div>
  );
}

/** Page transition wrapper */
export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
