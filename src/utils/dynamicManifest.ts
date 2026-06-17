let prevUrl: string | null = null;

function imageToDataUrl(url: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function updatePwaManifest(name: string, logoUrl?: string) {
  let icons = [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
  if (logoUrl) {
    try {
      const [i192, i512] = await Promise.all([
        imageToDataUrl(logoUrl, 192),
        imageToDataUrl(logoUrl, 512),
      ]);
      icons = [
        { src: i192, sizes: '192x192', type: 'image/png' },
        { src: i512, sizes: '512x512', type: 'image/png' },
        { src: i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];
    } catch {}
  }
  const manifest = {
    name,
    short_name: name,
    description: `Manage your ${name} e-commerce bot`,
    theme_color: '#6366f1',
    background_color: '#f9fafb',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'minimal-ui'],
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    icons,
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) {
    link.href = url;
  }
  if (prevUrl) URL.revokeObjectURL(prevUrl);
  prevUrl = url;
}
