import React from 'react';
import { motion } from 'motion/react';

export default function StatCard({ title, value, icon: Icon, trend, color = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500 to-purple-600 shadow-indigo-100',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-100',
    rose: 'from-rose-500 to-pink-600 shadow-rose-100',
    amber: 'from-amber-500 to-orange-600 shadow-amber-100',
  };

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 active:border-indigo-200 transition-colors"
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-base sm:text-2xl font-bold text-gray-900 truncate leading-tight mt-0.5">{value}</h3>
        {trend && (
          <p className={`text-[10px] sm:text-xs font-bold mt-0.5 ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last month
          </p>
        )}
      </div>
    </motion.div>
  );
}
