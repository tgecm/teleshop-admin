import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser } from '../api/customers';
import { getOrders } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { 
  Search, 
  User, 
  ShoppingBag, 
  Ban, 
  CheckCircle2, 
  MoreVertical, 
  ChevronRight,
  MessageSquare,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Customers() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [confirmCustomer, setConfirmCustomer] = useState(null);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['users', 'customers', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const { data: orders } = useQuery({
    queryKey: ['orders', selectedBotId],
    queryFn: () => getOrders({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, is_blocked }) => updateUser(id, { is_blocked }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['users', 'customers', selectedBotId]);
      addToast(variables.is_blocked ? 'Customer blocked' : 'Customer unblocked');
    },
    onError: () => addToast('Failed to update customer status', 'error'),
  });

  const getCustomerOrderCount = (customerId) => {
    return orders?.filter(o => o.customer_id === customerId).length || 0;
  };

  const filteredCustomers = customers?.filter(c => {
    if (filterTab === 'blocked' && !c.is_blocked) return false;
    const term = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.telegram_id?.toString().includes(term)
    );
  }) || [];

  if (customersLoading) return <LoadingSkeleton type="list" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Customers</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({customers?.length || 0})
        </button>
        <button
          onClick={() => setFilterTab('blocked')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'blocked'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Ban className="w-3 h-3" />
            Blocked ({customers?.filter(c => c.is_blocked)?.length || 0})
          </span>
        </button>
      </div>

      <div className="text-center md:hidden">
        <p className="text-[10px] text-gray-400 italic">Pull down to refresh</p>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No customers found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : "Customers will appear here once they interact with your bot."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCustomers.map(customer => (
            <motion.div 
              layout
              key={customer.id}
              className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${customer.is_blocked ? 'border-rose-100 bg-rose-50/30' : 'border-gray-100'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-sm ${customer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {customer.first_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[120px] sm:max-w-none">{customer.first_name}</p>
                      {customer.is_blocked && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-bold uppercase rounded-md flex items-center gap-1 border border-rose-200">
                          <Ban className="w-2 h-2" /> Blocked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">@{customer.username || 'no_username'}</span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <ShoppingBag className="w-3 h-3 text-indigo-600" />
                        {getCustomerOrderCount(customer.id)} orders
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirmCustomer(customer)}
                    disabled={toggleBlockMutation.isPending}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all shadow-sm active:scale-90 ${
                      customer.is_blocked
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                    }`}
                  >
                    {toggleBlockMutation.isPending ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> :
                      (customer.is_blocked ? <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" /> : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />)}
                  </button>
                  <button className="p-2 sm:p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:bg-gray-100 active:scale-90 transition-all">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmCustomer}
        onClose={() => setConfirmCustomer(null)}
        onConfirm={() => {
          if (confirmCustomer) {
            toggleBlockMutation.mutate({ id: confirmCustomer.id, is_blocked: !confirmCustomer.is_blocked });
            setConfirmCustomer(null);
          }
        }}
        title={confirmCustomer?.is_blocked ? 'Unblock Customer' : 'Block Customer'}
        message={`Are you sure you want to ${confirmCustomer?.is_blocked ? 'unblock' : 'block'} this customer?`}
        confirmText={confirmCustomer?.is_blocked ? 'Unblock' : 'Block'}
        variant={confirmCustomer?.is_blocked ? 'warning' : 'danger'}
        loading={toggleBlockMutation.isPending}
      />
    </div>
  );
}
