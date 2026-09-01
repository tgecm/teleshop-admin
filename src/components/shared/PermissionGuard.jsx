import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { ShieldX } from 'lucide-react';

const ROUTE_PERM_MAP = {
  dashboard: 'dashboard',
  profit: 'profit',
  orders: 'orders',
  products: 'products',
  customers: 'customers',
  chats: 'chats',
  newsfeed: 'newsfeed',
  payments: 'payments',
  subscription: 'subscription',
  customization: 'customize',
  'ai-agent': 'ai_agent',
  'qr-menu/dashboard': 'qr_dashboard',
  'qr-menu': 'qr_menu_items',
  'qr-menu/tables': 'qr_tables',
  'qr-menu/orders': 'qr_orders',
  faqs: 'faqs',
  broadcast: 'telegram_broadcast',
  commands: 'telegram_command',
  'bot-customization': 'telegram_bot',
  settings: 'settings',
};

export default function PermissionGuard({ children }) {
  const { user, isStaff } = useAuthStore();

  const { data: staffPerms, isLoading, isError } = useQuery({
    queryKey: ['staff-permissions', user?.id],
    queryFn: () => client.get(`/staff/${user.id}/permissions`).then(r => r.data?.permissions || {}),
    enabled: isStaff && !!user?.id,
    staleTime: 5000,
    retry: false,
  });

  if (!isStaff) return children;

  const path = window.location.pathname.replace(/^\//, '');
  const requiredPerm = ROUTE_PERM_MAP[path];

  if (!requiredPerm) return children;

  if (isLoading) return null;

  if (isError) {
    console.warn('[PermissionGuard] Failed to load permissions for user', user?.id);
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <ShieldX className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Permission Check Failed</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Could not verify your permissions. Please try refreshing the page or contact your admin.
        </p>
      </div>
    );
  }

  const hasPerm = staffPerms?.[requiredPerm] === true ||
    (requiredPerm === 'settings' && (staffPerms?.settings === true || staffPerms?.settings_general === true)) ||
    (requiredPerm.startsWith('qr_') && staffPerms?.qr_menu === true) ||
    (requiredPerm.startsWith('telegram_') && staffPerms?.telegram === true);

  if (!hasPerm) {
    console.warn('[PermissionGuard] Denied', path, 'required:', requiredPerm, 'perms:', staffPerms);
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <ShieldX className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Permission Not Allowed</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          You don't have permission to access this page. Contact your admin to update your access.
        </p>
      </div>
    );
  }

  return children;
}
