import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentMethods, createPayment, updatePayment, deletePayment } from '../api/payments';
import { uploadImage } from '../api/products';
import { useSelectedBot } from '../hooks/useSelectedBot';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { 
  Plus, 
  CreditCard, 
  Edit2, 
  Trash2, 
  QrCode, 
  X, 
  Check, 
  Loader2, 
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Payments() {
  const { selectedBotId } = useSelectedBot();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    name: '', payment_number: '', description: '', qr_code_url: '', notes: '', is_active: true
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', selectedBotId],
    queryFn: () => getPaymentMethods({ bot_id: selectedBotId }),
    enabled: !!selectedBotId,
  });

  const mutation = useMutation({
    mutationFn: (data) => editingPayment ? updatePayment(editingPayment.id, data) : createPayment({ ...data, bot_id: selectedBotId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePayment(id),
    onSuccess: () => queryClient.invalidateQueries(['payments']),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setFormData({ ...formData, qr_code_url: res.url });
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const openModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        name: payment.name,
        payment_number: payment.payment_number,
        description: payment.description || '',
        qr_code_url: payment.qr_code_url || '',
        notes: payment.notes || '',
        is_active: payment.is_active
      });
    } else {
      setEditingPayment(null);
      setFormData({ name: '', payment_number: '', description: '', qr_code_url: '', notes: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <button 
          onClick={() => openModal()}
          className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Method
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-48" />)
        ) : payments?.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-[32px] text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No payment methods</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">Add your first payment method to start receiving orders.</p>
            <button 
              onClick={() => openModal()}
              className="mt-6 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all"
            >
              Add Method
            </button>
          </div>
        ) : (
          payments?.map((payment) => (
            <motion.div 
              layout
              key={payment.id}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-indigo-100 transition-all group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openModal(payment)}
                      className="p-2 bg-gray-50 hover:bg-indigo-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Delete this payment method?')) deleteMutation.mutate(payment.id);
                      }}
                      className="p-2 bg-gray-50 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-gray-900 truncate">{payment.name}</h4>
                <p className="text-sm font-bold text-indigo-600 mt-1">{payment.payment_number}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${payment.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {payment.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {payment.qr_code_url && (
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                      <QrCode className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => openModal()}
        className="sm:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center text-white hover:bg-indigo-700 transition-all active:scale-90 z-40 border-4 border-white"
      >
        <Plus className="w-8 h-8" />
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingPayment ? 'Edit Method' : 'Add Method'}
                  </h3>
                  <button onClick={closeModal} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate(formData);
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Bank / Wallet Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. KBZPay"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Account Number / Phone</label>
                      <input 
                        type="text" 
                        required
                        placeholder="09xxxxxxxxx"
                        value={formData.payment_number}
                        onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Instructions</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Please send money and upload screenshot."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">QR Code (Optional)</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {formData.qr_code_url ? (
                          <img src={formData.qr_code_url} alt="QR" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <QrCode className="w-8 h-8 text-gray-200" />
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {formData.qr_code_url ? 'Change QR' : 'Upload QR'}
                        </div>
                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${formData.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Active Status</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Enable method</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`w-14 h-7 rounded-full transition-colors relative ${formData.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${formData.is_active ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={mutation.isPending}
                      className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Save Method
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
