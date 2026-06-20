import { Crown, Utensils } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useBotStore } from '../../store/botStore';
import { useAuthStore } from '../../store/authStore';

export default function PlanGate({ children }) {
  const { bots, botsLoaded, selectedBotId } = useBotStore();
  const { isSuperadmin } = useAuthStore();
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const planName = selectedBot?.plan_name?.toLowerCase() || 'free';

  // Superadmin can see all bots' dashboards regardless of plan
  if (isSuperadmin) return children;

  const path = window.location.pathname.replace(/^\//, '');
  if (path === 'subscription') return children;

  // Bots haven't loaded yet — don't flash upgrade gate
  if (!botsLoaded) return null;

  const isQrRoute = path.startsWith('qr-menu');

  if (planName === 'free' || planName === 'basic') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
          <Crown className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Upgrade Standard and Above to use this Web Panel
        </p>
        <NavLink to="/subscription"
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Upgrade Now
        </NavLink>
      </div>
    );
  }

  if (isQrRoute && planName === 'standard') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
          <Utensils className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          QR Menu System is available on Pro and Business plans only
        </p>
        <NavLink to="/subscription"
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Upgrade Now
        </NavLink>
      </div>
    );
  }

  return children;
}
