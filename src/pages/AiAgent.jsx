import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getBot, getAiSettings, updateAiSettings, testAiFollowup } from '../api/bots';
import { getAdminQuickQuestions, createQuickQuestion, updateQuickQuestion, deleteQuickQuestion } from '../api/quickQuestions';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import BotSwitcher from '../components/shared/BotSwitcher';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Brain,
  Save,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Sparkles,
  Zap,
  UserCircle,
  HelpCircle,
  Send,
  Loader2,
  Maximize2,
  X
} from 'lucide-react';

export default function AiAgent() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);
  const isSuperadmin = useAuthStore((state) => state.isSuperadmin);
  const { selectedBotId, selectedBot } = useSelectedBot();

  // Main AI Settings State
  const [aiEnabled, setAiEnabled] = useState(false);
  const [gender, setGender] = useState('female');
  const [websitePrompt, setWebsitePrompt] = useState('');
  const [telegramPrompt, setTelegramPrompt] = useState('');

  // Full-Screen Prompt Editor Popup State
  const [fullscreenPromptType, setFullscreenPromptType] = useState(null); // 'website' | 'telegram' | null
  const [tempPromptText, setTempPromptText] = useState('');

  // Follow-Up Rules Modal State
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDays, setFollowupDays] = useState(10);
  const [followupTimes, setFollowupTimes] = useState(3);

  // Quick Questions State
  const [showQuickQuestionModal, setShowQuickQuestionModal] = useState(false);
  const [quickQuestionsExpanded, setQuickQuestionsExpanded] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [responseType, setResponseType] = useState('preset');
  const [presetAnswerText, setPresetAnswerText] = useState('');

  // Fetch AI Settings
  const { data: aiSettings, isLoading: loadingAi } = useQuery({
    queryKey: ['aiSettings', selectedBotId],
    queryFn: () => getAiSettings(selectedBotId),
    enabled: !!selectedBotId
  });

  // Sync state when aiSettings changes
  React.useEffect(() => {
    if (aiSettings) {
      setAiEnabled(Boolean(aiSettings.is_enabled));
      setGender(aiSettings.gender || 'female');
      setWebsitePrompt(aiSettings.website_system_context || '');
      setTelegramPrompt(aiSettings.system_context || '');
      setFollowupDays(aiSettings.followup_days ?? 10);
      setFollowupTimes(aiSettings.followup_times ?? 3);
    }
  }, [aiSettings]);

  // Fetch Quick Questions
  const { data: quickQuestions = [] } = useQuery({
    queryKey: ['quickQuestions', selectedBotId],
    queryFn: () => getAdminQuickQuestions(selectedBotId),
    enabled: !!selectedBotId,
  });

  // AI Settings Mutation
  const updateAiSettingsMutation = useMutation({
    mutationFn: (data) => updateAiSettings(selectedBotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiSettings', selectedBotId]);
      addToast('AI Agent settings saved successfully');
    },
    onError: (err) => {
      addToast(err?.response?.data?.detail || 'Failed to update AI settings', 'error');
    }
  });

  // Quick Question Mutations
  const createQuestionMutation = useMutation({
    mutationFn: createQuickQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries(['quickQuestions', selectedBotId]);
      addToast('Quick Question created successfully');
      setShowQuickQuestionModal(false);
      resetQuestionForm();
    },
    onError: (err) => addToast(err?.response?.data?.detail || 'Failed to create question', 'error')
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateQuickQuestion({ id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['quickQuestions', selectedBotId]);
      addToast('Quick Question updated');
      setShowQuickQuestionModal(false);
      resetQuestionForm();
    },
    onError: (err) => addToast(err?.response?.data?.detail || 'Failed to update question', 'error')
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => deleteQuickQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quickQuestions', selectedBotId]);
      addToast('Quick Question deleted');
    },
    onError: (err) => addToast(err?.response?.data?.detail || 'Failed to delete question', 'error')
  });

  const testFollowupMutation = useMutation({
    mutationFn: () => testAiFollowup(selectedBotId),
    onSuccess: (res) => {
      const count = res?.processed_count || 0;
      if (count > 0) {
        addToast(`⚡ Test Trigger Success! Sent ${count} AI follow-up message(s) to active chat(s).`, 'success');
      } else {
        addToast('⚡ Test Run Completed! All chats are up to date.', 'info');
      }
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
    onError: (err) => addToast(err?.response?.data?.detail || 'Failed to trigger test follow-up', 'error')
  });

  function resetQuestionForm() {
    setEditingQuestion(null);
    setQuestionText('');
    setResponseType('preset');
    setPresetAnswerText('');
  }

  const handleSaveMainAi = (e) => {
    e.preventDefault();
    updateAiSettingsMutation.mutate({
      is_enabled: aiEnabled,
      gender,
      website_system_context: websitePrompt
    });
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      addToast('Question text is required', 'error');
      return;
    }
    if (responseType === 'preset' && !presetAnswerText.trim()) {
      addToast('Preset Answer text is required', 'error');
      return;
    }

    if (editingQuestion) {
      updateQuestionMutation.mutate({
        id: editingQuestion.id,
        question: questionText.trim(),
        response_type: responseType,
        preset_answer: responseType === 'preset' ? presetAnswerText.trim() : null,
        is_active: editingQuestion.is_active
      });
    } else {
      createQuestionMutation.mutate({
        bot_id: Number(selectedBotId),
        question: questionText.trim(),
        response_type: responseType,
        preset_answer: responseType === 'preset' ? presetAnswerText.trim() : null
      });
    }
  };

  const isFollowupActive = Boolean(aiSettings?.is_followup_enabled === true || aiSettings?.is_followup_enabled === 't');

  if (loadingAi) return <LoadingSkeleton count={3} />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Agent Settings</h1>
          </div>
          <p className="text-xs text-gray-500">Configure AI personality, live chat questions, and smart follow-up rules.</p>
        </div>
        <BotSwitcher />
      </div>

      {/* Main AI Settings Section */}
      <form onSubmit={handleSaveMainAi} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">AI Agent Website Prompt</h2>
              <p className="text-[11px] text-gray-500">Enable AI responses for website live chat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiEnabled(prev => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
              aiEnabled ? 'bg-cyan-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
              aiEnabled ? 'left-6.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {aiEnabled && (
          <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            {/* Gender Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <UserCircle className="w-4 h-4 text-cyan-600" />
                AI Agent Gender / Tone
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gender === 'male'
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-300 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  👨 Male Tone
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gender === 'female'
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-300 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  👩 Female Tone
                </button>
              </div>
            </div>

            {/* Custom System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Brain className="w-4 h-4 text-cyan-600" />
                  Custom Instructions(Website)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTempPromptText(websitePrompt);
                    setFullscreenPromptType('website');
                  }}
                  className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 bg-cyan-50 px-2.5 py-1 rounded-xl hover:bg-cyan-100 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Full Screen
                </button>
              </div>
              <div
                onClick={() => {
                  setTempPromptText(websitePrompt);
                  setFullscreenPromptType('website');
                }}
                className="w-full p-3 rounded-2xl border border-gray-200 hover:border-cyan-400 bg-gray-50/50 hover:bg-white text-xs text-gray-800 leading-relaxed cursor-pointer transition-all min-h-[96px]"
              >
                {websitePrompt ? (
                  <p className="whitespace-pre-wrap line-clamp-4">{websitePrompt}</p>
                ) : (
                  <span className="text-gray-400 italic">Click to type or edit website custom instructions in full screen...</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateAiSettingsMutation.isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {updateAiSettingsMutation.isPending ? 'Saving...' : 'Save AI Settings'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Web Chat Quick Questions Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div
          className="flex items-center justify-between cursor-pointer select-none group"
          onClick={() => setQuickQuestionsExpanded(prev => !prev)}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Quick Questions
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {quickQuestions.length}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500">Preset Q&A & AI chips shown above live chat</p>
            </div>
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 group-hover:text-gray-700 transition-colors ml-1"
            >
              {quickQuestionsExpanded ? (
                <ChevronDown className="w-4 h-4 text-cyan-600" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetQuestionForm();
              setShowQuickQuestionModal(true);
            }}
            className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {quickQuestionsExpanded && (
          <div className="space-y-2.5 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            {quickQuestions.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  resetQuestionForm();
                  setShowQuickQuestionModal(true);
                }}
                className="w-full p-4 rounded-2xl bg-gray-50 hover:bg-cyan-50/50 text-center text-xs text-gray-500 border border-dashed border-gray-200 hover:border-cyan-300 transition-all cursor-pointer block"
              >
                No quick questions added yet. Click "+ Add Question" above to create one.
              </button>
            ) : (
              quickQuestions.map((q) => (
                <div key={q.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        q.response_type === 'preset' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {q.response_type === 'preset' ? 'Preset Message' : 'AI Answer'}
                      </span>
                      {!q.is_active && (
                        <span className="text-[9px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Disabled</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-800 truncate">{q.question}</p>
                    {q.response_type === 'preset' && q.preset_answer && (
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 italic">"{q.preset_answer}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateQuestionMutation.mutate({
                          id: q.id,
                          question: q.question,
                          response_type: q.response_type,
                          preset_answer: q.preset_answer,
                          is_active: !q.is_active
                        });
                      }}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${q.is_active ? 'text-cyan-600 hover:bg-cyan-50' : 'text-gray-400 hover:bg-gray-200'}`}
                      title={q.is_active ? "Disable" : "Enable"}
                    >
                      {q.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion(q);
                        setQuestionText(q.question);
                        setResponseType(q.response_type);
                        setPresetAnswerText(q.preset_answer || '');
                        setShowQuickQuestionModal(true);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this quick question?')) {
                          deleteQuestionMutation.mutate(q.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Smart AI Auto Follow-Up Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                AI Auto Follow-Up
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-100 text-cyan-700 uppercase">Smart AI</span>
              </h2>
              <p className="text-[11px] text-gray-500">Auto follow-up with idle chats based on conversation context</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              updateAiSettingsMutation.mutate({
                is_followup_enabled: !isFollowupActive,
                followup_days: aiSettings?.followup_days ?? 10,
                followup_times: aiSettings?.followup_times ?? 3
              });
            }}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
              isFollowupActive ? 'bg-cyan-500' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
              isFollowupActive ? 'left-6.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {isFollowupActive && (
          <div className="pt-3 border-t border-gray-100 space-y-4 animate-in fade-in duration-200">
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-800">
                  Current Follow-Up Rules
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Follows up every <strong className="text-cyan-600 font-bold">{aiSettings?.followup_days ?? 10} Day(s)</strong>, up to <strong className="text-indigo-600 font-bold">{aiSettings?.followup_times ?? 3} Time(s)</strong> maximum.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => testFollowupMutation.mutate()}
                    disabled={testFollowupMutation.isPending}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                    title="Force run follow-up immediately for testing (Superadmin only)"
                  >
                    {testFollowupMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                    {testFollowupMutation.isPending ? 'Testing...' : 'Test Run Now'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFollowupDays(aiSettings?.followup_days ?? 10);
                    setFollowupTimes(aiSettings?.followup_times ?? 3);
                    setShowFollowupModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  Configure Rules
                </button>
              </div>
            </div>

            <div className="bg-cyan-50/70 p-3 rounded-2xl border border-cyan-100 text-xs text-cyan-950 leading-relaxed">
              💡 <strong>Smart AI Context:</strong> AI reads chat history & language to send smart follow-ups across Telegram, Website & Guest chats.
            </div>
          </div>
        )}
      </div>

      {/* Telegram Bot AI Custom Prompt Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Telegram Bot</h2>
              <p className="text-[11px] text-gray-500">Custom Prompt</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              updateAiSettingsMutation.mutate({ system_context: telegramPrompt });
            }}
            disabled={updateAiSettingsMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            {updateAiSettingsMutation.isPending ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div
            onClick={() => {
              setTempPromptText(telegramPrompt);
              setFullscreenPromptType('telegram');
            }}
            className="w-full p-3.5 rounded-2xl border border-gray-200 hover:border-cyan-400 bg-gray-50/50 hover:bg-white text-xs text-gray-800 leading-relaxed cursor-pointer transition-all min-h-[110px]"
          >
            {telegramPrompt ? (
              <p className="whitespace-pre-wrap line-clamp-5">{telegramPrompt}</p>
            ) : (
              <span className="text-gray-400 italic">Click to type or edit Telegram bot custom prompt in full screen...</span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 italic">
            Custom system prompt used by your Telegram bot for answering customer questions and automated replies.
          </p>
        </div>
      </div>

      {/* Add / Edit Quick Question Modal */}
      {showQuickQuestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingQuestion ? 'Edit Quick Question' : 'Add Web Quick Question'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowQuickQuestionModal(false);
                  resetQuestionForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Question Pill Text (Shown to Customer)
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. COD ရလား?"
                  className="w-full p-3 rounded-2xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Response Behavior Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResponseType('preset')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      responseType === 'preset'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    💬 Preset Message
                    <p className="text-[10px] font-normal text-gray-500 mt-0.5">Instant static reply (no AI needed)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseType('ai')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      responseType === 'ai'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🤖 AI Dynamic Answer
                    <p className="text-[10px] font-normal text-gray-500 mt-0.5">AI answers dynamically using shop context</p>
                  </button>
                </div>
              </div>

              {responseType === 'preset' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Preset Static Answer Message
                  </label>
                  <textarea
                    value={presetAnswerText}
                    onChange={(e) => setPresetAnswerText(e.target.value)}
                    placeholder="Enter instant answer text..."
                    rows={3}
                    className="w-full p-3 rounded-2xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 text-xs outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickQuestionModal(false);
                    resetQuestionForm();
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
                >
                  {createQuestionMutation.isPending || updateQuestionMutation.isPending
                    ? 'Saving...'
                    : editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Full-Screen Prompt Editor Popup */}
      <AnimatePresence>
        {fullscreenPromptType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-white"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-white">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {fullscreenPromptType === 'website' ? 'Custom Shop Instructions (Website)' : 'AI Custom Prompt (Telegram Bot)'}
                </h3>
                <p className="text-[11px] text-gray-400">Full-screen prompt editor for AI assistant instructions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFullscreenPromptType(null)}
                  className="px-3.5 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fullscreenPromptType === 'website') {
                      setWebsitePrompt(tempPromptText);
                      updateAiSettingsMutation.mutate({ website_system_context: tempPromptText });
                    } else if (fullscreenPromptType === 'telegram') {
                      setTelegramPrompt(tempPromptText);
                      updateAiSettingsMutation.mutate({ system_context: tempPromptText });
                    }
                    setFullscreenPromptType(null);
                  }}
                  disabled={updateAiSettingsMutation.isPending}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                >
                  {updateAiSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Prompt
                </button>
              </div>
            </div>

            <textarea
              value={tempPromptText}
              onChange={(e) => setTempPromptText(e.target.value)}
              placeholder="လုပ်ငန်းအသေးစိတ်၊ ဖုန်းနံပါတ်၊ လိပ်စာနှင့် ဝန်ဆောင်မှုအကြောင်း အကြမ်းဖျင်းရေးပေးပါ။"
              className="flex-1 w-full px-5 sm:px-8 py-5 bg-white outline-none text-xs sm:text-sm leading-relaxed resize-none overflow-y-auto"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow-Up Rules Modal Popup */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Configure AI Auto Follow-Up Rules
              </h3>
              <button
                type="button"
                onClick={() => setShowFollowupModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const daysNum = Math.max(1, parseInt(followupDays, 10) || 1);
                const timesNum = Math.max(1, parseInt(followupTimes, 10) || 1);
                updateAiSettingsMutation.mutate({
                  is_followup_enabled: true,
                  followup_days: daysNum,
                  followup_times: timesNum
                });
                setShowFollowupModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Follow-Up Days Interval
                </label>
                <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-400 bg-white">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={followupDays}
                    onChange={(e) => setFollowupDays(e.target.value.replace(/\D/g, ''))}
                    placeholder="5"
                    required
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none"
                  />
                  <span className="px-4 py-2.5 bg-gray-50 border-l border-gray-200 text-xs font-bold text-gray-500">
                    Days
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Number of days between follow-up messages.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Maximum Follow-Up Count
                </label>
                <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-400 bg-white">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={followupTimes}
                    onChange={(e) => setFollowupTimes(e.target.value.replace(/\D/g, ''))}
                    placeholder="3"
                    required
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none"
                  />
                  <span className="px-4 py-2.5 bg-gray-50 border-l border-gray-200 text-xs font-bold text-gray-500">
                    Times
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Maximum number of times AI will follow up before stopping.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowFollowupModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAiSettingsMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {updateAiSettingsMutation.isPending ? 'Saving...' : 'Save Rules'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
