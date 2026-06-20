import { useEffect, useState } from 'react';

interface ToastNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function NotificationToast() {
  const [notification, setNotification] = useState<ToastNotification | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastNotification;
      setNotification(detail);
      setTimeout(() => setNotification(null), 4000);
    };
    window.addEventListener('app:notification', handler);
    return () => window.removeEventListener('app:notification', handler);
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-slide-up">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-4 border border-gray-700">
        <p className="font-semibold text-sm text-blue-400">{notification.title}</p>
        <p className="text-sm mt-1 text-gray-200">{notification.body}</p>
      </div>
    </div>
  );
}
