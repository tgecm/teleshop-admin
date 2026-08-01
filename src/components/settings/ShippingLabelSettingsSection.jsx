import { useState, useEffect, useRef } from 'react';
import { Printer, Save, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LABEL_PRESETS, getLabelSettings, saveLabelSettings } from '../orders/PrintLabelConfirmModal';
import { useBotStore } from '../../store/botStore';
import { useToastStore } from '../../store/toastStore';
import { getContentBlocks, updateContentBlock } from '../../api/contentBlocks';

export default function ShippingLabelSettingsSection() {
  const queryClient = useQueryClient();
  const { selectedBotId, bots } = useBotStore();
  const addToast = useToastStore(state => state.addToast);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const savedSnapshot = useRef(null);

  const selectedBot = Array.isArray(bots) ? bots.find(b => b.id?.toString() === selectedBotId?.toString()) : null;
  const rawPlan = selectedBot?.plan_name || 'Standard';
  const planKey = rawPlan.toLowerCase();
  const isPrinterAllowed = planKey === 'pro' || planKey === 'business';
  const displayPlanName = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);

  // Fetch content blocks from database
  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const receiptBlock = contentBlocks?.find(b => b.key === 'receipt_settings');
  const dbLabelSettings = receiptBlock?.content_data || {};

  const [settings, setSettings] = useState(() => {
    const initial = getLabelSettings(dbLabelSettings);
    savedSnapshot.current = { ...initial };
    return initial;
  });

  // Sync state whenever database label settings are fetched or updated
  useEffect(() => {
    if (receiptBlock?.content_data) {
      setSettings(prev => {
        const merged = { ...prev, ...receiptBlock.content_data };
        savedSnapshot.current = { ...merged };
        return merged;
      });
    }
  }, [receiptBlock]);

  const hasChanges = (() => {
    if (!savedSnapshot.current) return false;
    const s = savedSnapshot.current;
    return (
      s.presetId !== settings.presetId ||
      s.customWidthMm !== settings.customWidthMm ||
      s.customHeightMm !== settings.customHeightMm
    );
  })();

  // Database Save Mutation
  const saveMutation = useMutation({
    mutationFn: (newSettings) => {
      const mergedData = {
        ...(receiptBlock?.content_data || {}),
        ...newSettings,
      };
      return updateContentBlock(Number(selectedBotId), 'receipt_settings', mergedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      saveLabelSettings(settings); // Backup locally for offline fallback
      setShowCustomForm(false); // Hide custom form after successful save
      addToast('Label settings saved successfully!', 'success');
    },
    onError: (err) => {
      console.error('Failed to Save', err);
      addToast(err?.message || 'Failed to save settings', 'error');
    }
  });

  const handleSave = () => {
    if (!isPrinterAllowed) {
      addToast(`${displayPlanName} Plan not allow to change Printers. Please Upgarde`, 'error');
      return;
    }
    setShowCustomForm(false);
    savedSnapshot.current = { ...settings };
    saveLabelSettings(settings);
    if (selectedBotId) {
      saveMutation.mutate(settings);
    } else {
      addToast('Saved locally', 'success');
    }
  };

  const handlePresetSelect = (presetId) => {
    if (!isPrinterAllowed) {
      addToast(`${displayPlanName} Plan not allow to change Printers. Please Upgarde`, 'error');
      return;
    }
    setSettings(prev => ({ ...prev, presetId }));
    if (presetId === 'custom') {
      setShowCustomForm(prev => !prev);
    } else {
      setShowCustomForm(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Print Settings</h3>
              {!isPrinterAllowed && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Pro & Business Only
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Print Preferences</p>
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-700">Select Default Paper Size Preset:</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
          {LABEL_PRESETS.map((preset) => {
            const isSelected = settings.presetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between ${
                  !isPrinterAllowed
                    ? 'opacity-70 cursor-not-allowed bg-gray-50 border-gray-200'
                    : isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-sm cursor-pointer'
                    : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    {preset.name}
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    {!isPrinterAllowed && <Lock className="w-3 h-3 text-amber-500 ml-auto" />}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{preset.desc}</div>
                  <div className="text-[10px] font-bold text-indigo-600 mt-1">
                    {preset.id === 'custom' ? `${settings.customWidthMm || 100} × ${settings.customHeightMm || 150} mm` : `${preset.widthMm} × ${preset.heightMm} mm`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Dimension Inputs if Custom selected & showCustomForm is true */}
      {settings.presetId === 'custom' && showCustomForm && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-amber-900">Custom Paper Dimensions (in millimeters)</div>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-600">Width (mm):</label>
              <input
                type="text"
                inputMode="numeric"
                value={settings.customWidthMm ?? ''}
                placeholder="100"
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings(prev => ({ ...prev, customWidthMm: val }));
                }}
                onBlur={() => {
                  const num = Number(settings.customWidthMm);
                  if (!num || num <= 0) {
                    setSettings(prev => ({ ...prev, customWidthMm: 100 }));
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600">Height (mm):</label>
              <input
                type="text"
                inputMode="numeric"
                value={settings.customHeightMm ?? ''}
                placeholder="150"
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings(prev => ({ ...prev, customHeightMm: val }));
                }}
                onBlur={() => {
                  const num = Number(settings.customHeightMm);
                  if (!num || num <= 0) {
                    setSettings(prev => ({ ...prev, customHeightMm: 150 }));
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
