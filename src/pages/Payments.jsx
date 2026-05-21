import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentMethods, createPayment, updatePayment, deletePayment } from '../api/payments';
import { uploadImage, getImageUrl } from '../api/products';
import { useSelectedBot } from '../hooks/useSelectedBot';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  Plus,
  CreditCard,
  Edit2,
  Trash2,
  QrCode,
  X,
  Check,
  Loader2,
  ImageUp,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function compressImage(file, maxDimension = 720) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function Payments() {
  const { selectedBotId } = useSelectedBot();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    name: '', account_name: '', payment_number: '', description: '', qr_code_url: '', notes: '', is_active: true
  });
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', selectedBotId],
    queryFn: () => getPaymentMethods({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const mutation = useMutation({
    mutationFn: (data) => editingPayment ? updatePayment(editingPayment.id, data) : createPayment({ ...data, bot_id: Number(selectedBotId) }),
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
      const compressed = await compressImage(file);
      const res = await uploadImage(compressed, selectedBotId);
      setFormData({ ...formData, qr_code_url: res.url || res.file_id });
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const removeQrCode = () => {
    setFormData({ ...formData, qr_code_url: '' });
  };

  const openModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        name: payment.name,
        account_name: payment.account_name || '',
        payment_number: payment.payment_number,
        description: payment.description || '',
        qr_code_url: payment.qr_code_url || '',
        notes: payment.notes || '',
        is_active: payment.is_active
      });
    } else {
      setEditingPayment(null);
      setFormData({ name: '', account_name: '', payment_number: '', description: '', qr_code_url: '', notes: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    setUploading(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Payments</h1>
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
                      onClick={() => setConfirmDelete(payment.id)}
                      className="p-2 bg-gray-50 hover:bg-rose-50 rounded-xl text-gray-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-gray-900 truncate">{payment.name}</h4>
                {payment.account_name && <p className="text-xs text-gray-500 mt-0.5">{payment.account_name}</p>}
                <p className="text-sm font-bold text-indigo-600 mt-1">{payment.payment_number}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${payment.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {payment.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {payment.qr_code_url && (
                    <div className="relative group">
                      <img
                        src={getImageUrl(payment.qr_code_url, selectedBotId)}
                        alt="QR"
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <QrCode className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      
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
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-20 md:pb-12">
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
                      <label className="text-sm font-bold text-gray-700 ml-1">Wallet / Bank Name</label>
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
                      <label className="text-sm font-bold text-gray-700 ml-1">Account Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Your Account Name"
                        value={formData.account_name}
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Account Phone Number</label>
                      <input
                        type="text"
                        required
                        placeholder="09xxxxxxxxx"
                        value={formData.payment_number}
                        onChange={(e) => setFormData({ ...formData, payment_number: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Please double check the number before transferring"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 ml-1">QR Code</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {formData.qr_code_url ? (
                      <div className="relative w-40 h-40 mx-auto">
                        <img
                          src={getImageUrl(formData.qr_code_url, selectedBotId)}
                          alt="QR Code"
                          className="w-full h-full object-cover rounded-2xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeQrCode}
                          disabled={uploading}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all active:scale-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all active:scale-[0.98]"
                      >
                        {uploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        ) : (
                          <>
                            <ImageUp className="w-8 h-8 text-gray-300" />
                            <span className="text-sm font-bold text-gray-500">Upload QR Code</span>
                            <span className="text-[10px] text-gray-400">Auto-compress if &gt;720px • JPEG</span>
                          </>
                        )}
                      </button>
                    )}
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

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMutation.mutate(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        title="Delete Payment Method"
        message="Are you sure you want to delete this payment method?"
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
