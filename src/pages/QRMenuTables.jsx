import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { getBotPublicSlug } from '../api/public';
import { downloadBlob } from '../utils/download';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, Copy, Download, Trash2, QrCode, ExternalLink, Pen } from 'lucide-react';
import ConfirmDialog from '../components/shared/ConfirmDialog';

export default function QRMenuTables() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const qrRefs = useRef({});
  const [deletingTable, setDeletingTable] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');

  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: selectedBotId }),
    enabled: !!selectedBotId,
  });

  const { data: publicSlug } = useQuery({
    queryKey: ['public-slug', selectedBotId],
    queryFn: () => getBotPublicSlug(selectedBotId),
    enabled: !!selectedBotId,
  });

  const tableLinksBlock = contentBlocks?.find(b => b.key === 'qr_table_links');
  const tables = tableLinksBlock?.content_data?.tables || [];

  const saveMutation = useMutation({
    mutationFn: (tables) => updateContentBlock(selectedBotId, 'qr_table_links', { tables }),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
    },
    onError: () => addToast('Failed to save table links', 'error'),
  });

  const generateLink = () => {
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    saveMutation.mutate([...tables, { number: nextNum, created_at: new Date().toISOString() }]);
  };

  const deleteTable = (number) => {
    saveMutation.mutate(tables.filter(t => t.number !== number));
    setDeletingTable(null);
  };

  const renameTable = (number, newName) => {
    saveMutation.mutate(tables.map(t => t.number === number ? { ...t, name: newName } : t));
    setEditingName(null);
  };

  const startEditing = (table) => {
    setEditingName(table.number);
    setEditValue(table.name || '');
  };

  const getTableUrl = useCallback((number) => {
    if (!publicSlug?.slug) return '';
    return `https://telegramecommerce.shop/${publicSlug.slug}-qr-menu/t${number}`;
  }, [publicSlug]);

  const setQrRef = (number, node) => {
    if (node) qrRefs.current[number] = node;
  };

  const downloadQR = async (number) => {
    const canvas = qrRefs.current[number];
    if (!canvas) return;
    const table = tables.find(t => t.number === number);
    const label = (table?.name || `Table ${number}`).replace(/\s+/g, '-');

    const size = canvas.width;
    const padding = 20;
    const out = document.createElement('canvas');
    out.width = size + padding * 2;
    out.height = size + padding * 2;
    const ctx = out.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, padding, padding);

    const cx = out.width / 2;
    const cy = out.height / 2;
    const r = 22;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), cx, cy);

    const blob = await new Promise(resolve => out.toBlob(resolve));
    if (blob) await downloadBlob(blob, `${label.toLowerCase()}-qr.png`);
  };

  const copyLink = (number) => {
    const url = getTableUrl(number);
    if (!url) return;
    navigator.clipboard.writeText(url);
    const table = tables.find(t => t.number === number);
    addToast(`${table?.name || `Table ${number}`} link copied`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Table QR Codes</h1>
            <p className="text-xs text-gray-500">Generate unique QR codes for each table</p>
          </div>
        </div>
        <button
          onClick={generateLink}
          disabled={!publicSlug?.slug || saveMutation.isPending}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2 font-bold text-sm disabled:opacity-50 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Generate QR Link
        </button>
      </div>

      {!publicSlug?.slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm font-medium text-amber-700 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          Generate a public shop URL in Settings first before creating table links.
        </div>
      )}

      {tables.length === 0 && publicSlug?.slug ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No table links yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Click "Generate QR Link" to create your first table QR code
          </p>
          <button
            onClick={generateLink}
            disabled={saveMutation.isPending}
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-200"
          >
            Generate First QR Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => {
            const url = getTableUrl(table.number);
            return (
              <div key={table.number} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  {editingName === table.number ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameTable(table.number, editValue.trim() || null); if (e.key === 'Escape') setEditingName(null); }}
                      onBlur={() => renameTable(table.number, editValue.trim() || null)}
                      className="font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-orange-500 w-full mr-2"
                      autoFocus
                    />
                  ) : (
                    <h3 className="font-bold text-gray-900 truncate mr-2">{table.name || `Table ${table.number}`}</h3>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditing(table)}
                      className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Pen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTable(table)}
                      className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative flex justify-center mb-4">
                  <div className="relative inline-block">
                    {url && (
                      <QRCodeCanvas
                        ref={(node) => setQrRef(table.number, node)}
                        value={url}
                        size={180}
                        level="L"
                        includeMargin
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-gray-100">
                        <span className="font-bold text-base text-gray-900">{table.number}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => copyLink(table.number)}
                    className="w-full py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => downloadQR(table.number)}
                    className="w-full py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-bold text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <Download className="w-4 h-4" />
                    Download QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingTable}
        onClose={() => setDeletingTable(null)}
        onConfirm={() => { if (deletingTable) deleteTable(deletingTable.number); }}
        title={`Delete "${deletingTable?.name || `Table ${deletingTable?.number}`}"?`}
        message="Are you sure you want to delete this table QR code? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={saveMutation.isPending}
      />
    </div>
  );
}
