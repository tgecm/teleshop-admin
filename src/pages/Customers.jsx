import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser } from '../api/customers';
import { getOrders } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
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
    const term = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.telegram_id?.toString().includes(term)
    );
  }) || [];

  if (customersLoading) return <LoadingSkeleton type="list" count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm ${customer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {customer.first_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{customer.first_name}</p>
                      {customer.is_blocked && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-bold uppercase rounded-md flex items-center gap-1 border border-rose-200">
                          <Ban className="w-2 h-2" /> Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{customer.username || 'no_username'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Orders</p>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                      <ShoppingBag className="w-3 h-3 text-indigo-600" />
                      {getCustomerOrderCount(customer.id)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const action = customer.is_blocked ? 'unblock' : 'block';
                        if (confirm(`Are you sure you want to ${action} this customer?`)) {
                          toggleBlockMutation.mutate({ id: customer.id, is_blocked: !customer.is_blocked });
                        }
                      }}
                      disabled={toggleBlockMutation.isPending}
                      className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-90 ${
                        customer.is_blocked 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                      }`}
                    >
                      {toggleBlockMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                        (customer.is_blocked ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />)}
                    </button>
                    <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 hover:bg-gray-100 active:scale-90 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
