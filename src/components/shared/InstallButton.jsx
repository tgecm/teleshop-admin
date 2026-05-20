import { useState, useEffect } from 'react';
import { Download, Loader2, Smartphone, CheckCircle2 } from 'lucide-react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setLoading(true);
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setLoading(false);
    setDeferredPrompt(null);
    if (result.outcome === 'accepted') {
      setInstalled(true);
    } else {
      setDismissed(true);
    }
  };

  // Don't show if no prompt available, already installed, or dismissed
  if (!deferredPrompt || installed || dismissed) return null;

  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Install App</h3>
          <p className="text-xs text-gray-500">Add to your home screen for a full-screen experience</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>No browser tabs or URL bar</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Opens like a real app</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Quick access from home screen</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            disabled={loading}
            data-haptic
            className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? 'Installing...' : 'Install App'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition-all active:scale-[0.98] text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
