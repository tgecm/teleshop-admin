import {useState, useEffect, useCallback} from 'react';
import {useInstallPrompt} from '../hooks/useInstallPrompt';
import {useBotStore} from '../store/botStore';
import {updatePwaManifest} from '../utils/dynamicManifest';

export default function InstallPrompt() {
  const {canInstall, promptInstall, dismiss} = useInstallPrompt();
  const {bots, selectedBotId} = useBotStore();
  const [isMobile, setIsMobile] = useState(false);

  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const shopName = selectedBot?.bot_full_name || selectedBot?.bot_username || 'Shop';
  const shopLogo = selectedBot?.profile_picture;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    await updatePwaManifest(shopName, shopLogo);
    promptInstall();
  }, [shopName, shopLogo, promptInstall]);

  if (!canInstall || !isMobile) return null;
  if (!shopLogo) return null;

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-50 px-4 pb-2">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-indigo-50 flex items-center justify-center">
          {shopLogo ? (
            <img src={shopLogo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-indigo-600 font-bold text-xl">
              {shopName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            Install {shopName}
          </p>
          <p className="text-gray-500 text-xs">
            Add to home screen for quick access
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 px-2 py-1 text-lg"
          aria-label="Dismiss"
        >
          ✕
        </button>
        <button
          onClick={handleInstall}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap active:scale-95 transition-transform"
        >
          Install
        </button>
      </div>
    </div>
  );
}
