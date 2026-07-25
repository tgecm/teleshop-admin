import React, { Suspense } from 'react';
import { useThemeStore } from '../../store/themeStore';

// Classic (default) layout — existing components
const ClassicLayout = React.lazy(() => import('./Layout'));

// New layout variants (loaded on demand)
const MidnightLayout = React.lazy(() => import('./variants/MidnightLayout'));
const SlateLayout    = React.lazy(() => import('./variants/SlateLayout'));
const AuroraLayout   = React.lazy(() => import('./variants/AuroraLayout'));
const RoseLayout     = React.lazy(() => import('./variants/RoseLayout'));

function LayoutFallback() {
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

/**
 * ThemedLayout — renders the appropriate admin shell based on the active UI template.
 * All page content (Outlet) is shared; only the navigation chrome changes.
 */
export default function ThemedLayout() {
  const { theme } = useThemeStore();

  return (
    <Suspense fallback={<LayoutFallback />}>
      {theme === 'midnight' && <MidnightLayout />}
      {(theme === 'slate' || theme === 'slate-dark') && <SlateLayout />}
      {(theme === 'aurora' || theme === 'aurora-dark') && <AuroraLayout />}
      {(theme === 'rose' || theme === 'rose-dark') && <RoseLayout />}
      {/* Default / classic */}
      {(theme === 'classic' || !theme) && <ClassicLayout />}
    </Suspense>
  );
}
