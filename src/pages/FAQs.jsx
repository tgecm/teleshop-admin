import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getFaqs, createFaq, deleteFaq } from '../api/superadmin';
import {
  HelpCircle, Plus, X, Loader2, Trash2, ChevronDown, ChevronRight
} from 'lucide-react';
import { linkifyText } from '../utils/linkify';
import { motion, AnimatePresence } from 'motion/react';

export default function FAQs() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: getFaqs,
  });

  const createMutation = useMutation({
    mutationFn: () => createFaq(question.trim(), answer.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setQuestion('');
      setAnswer('');
      setShowCreate(false);
      addToast('FAQ created');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create FAQ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      addToast('FAQ deleted');
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">FAQs</h1>
            <p className="text-xs text-gray-500">Frequently asked questions</p>
          </div>
        </div>
        {user?.is_superadmin && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm active:scale-95">
            <Plus className="w-4 h-4" /> Create FAQ
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : !faqs || faqs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No FAQs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map(faq => (
            <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-bold text-gray-900">{faq.question}</span>
                <div className="flex items-center gap-2">
                  {user?.is_superadmin && (
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete this FAQ?')) deleteMutation.mutate(faq.id); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {expandedId === faq.id ? <ChevronDown className="w-4 h-4 text-gray-300" /> : <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              <AnimatePresence>
                {expandedId === faq.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-50">
                    <div className="px-5 py-4 bg-gray-50/50">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{linkifyText(faq.answer)}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  Create FAQ
                </h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Question</label>
                  <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter the question..." autoFocus />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Answer</label>
                  <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Enter the answer..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !question.trim() || !answer.trim()}
                  className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create FAQ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
