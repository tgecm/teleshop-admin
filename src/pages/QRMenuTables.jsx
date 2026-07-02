import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { getBotPublicSlug, listBotDomains } from '../api/public';
import { downloadBlob } from '../utils/download';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, Copy, Download, Trash2, QrCode, ExternalLink, Pen, SkipForward, RotateCcw, Ticket, ChevronLeft } from 'lucide-react';
import ConfirmDialog from '../components/shared/ConfirmDialog';

export default function QRMenuTables() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const qrRefs = useRef({});
  const [deletingTable, setDeletingTable] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [mode, setMode] = useState('table');
  const [deletingToken, setDeletingToken] = useState(null);

  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: selectedBotId }),
    enabled: !!selectedBotId,
    refetchInterval: mode === 'token' ? 5000 : false,
  });

  const { data: publicSlug } = useQuery({
    queryKey: ['public-slug', selectedBotId],
    queryFn: () => getBotPublicSlug(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: domains = [] } = useQuery({
    queryKey: ['bot-domains', selectedBotId],
    queryFn: () => listBotDomains(selectedBotId),
    enabled: !!selectedBotId,
  });

  const customDomain = domains.find(d => d.verified && d.enabled)?.domain || null;

  const tableLinksBlock = contentBlocks?.find(b => b.key === 'qr_table_links');
  const tables = tableLinksBlock?.content_data?.tables || [];

  const tokenQueueBlock = contentBlocks?.find(b => b.key === 'token_queue');
  const tokenQueue = tokenQueueBlock?.content_data || { current: 0, next: 1, assigned: [] };

  const saveMutation = useMutation({
    mutationFn: (tables) => updateContentBlock(selectedBotId, 'qr_table_links', { tables }),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
    },
    onError: () => addToast('Failed to save table links', 'error'),
  });

  const saveTokenMutation = useMutation({
    mutationFn: (data) => updateContentBlock(selectedBotId, 'token_queue', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      addToast('Token queue updated');
    },
    onError: () => addToast('Failed to update token queue', 'error'),
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

  const baseUrl = useMemo(() => {
    if (customDomain) return `https://${customDomain}`;
    return 'https://www.telegramecommerce.shop';
  }, [customDomain]);

  const getTableUrl = useCallback((number) => {
    if (!publicSlug?.slug) return '';
    return `${baseUrl}/${publicSlug.slug}-qr-menu/t${number}`;
  }, [publicSlug, baseUrl]);

  const getTokenUrl = useCallback(() => {
    if (!publicSlug?.slug) return '';
    return `${baseUrl}/${publicSlug.slug}-qr-menu?mode=token`;
  }, [publicSlug, baseUrl]);

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

    const blob = await new Promise(resolve => out.toBlob(resolve));
    if (blob) await downloadBlob(blob, `${label.toLowerCase()}-qr.png`);
  };

  const downloadTokenQR = async () => {
    const canvas = qrRefs.current['token'];
    if (!canvas) return;
    const size = canvas.width;
    const padding = 20;
    const out = document.createElement('canvas');
    out.width = size + padding * 2;
    out.height = size + padding * 2;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, padding, padding);
    const blob = await new Promise(resolve => out.toBlob(resolve));
    if (blob) await downloadBlob(blob, 'token-qr.png');
  };

  const copyLink = (number) => {
    const url = getTableUrl(number);
    if (!url) return;
    navigator.clipboard.writeText(url);
    const table = tables.find(t => t.number === number);
    addToast(`${table?.name || `Table ${number}`} link copied`);
  };

  const copyTokenLink = () => {
    const url = getTokenUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    addToast('Token link copied');
  };

  const advanceToken = () => {
    const nextServing = (tokenQueue.current || 0) + 1;
    const newAssigned = (tokenQueue.assigned || []).filter(t => t > nextServing);
    saveTokenMutation.mutate({ ...tokenQueue, current: nextServing, assigned: newAssigned });
  };

  const resetTokenQueue = () => {
    saveTokenMutation.mutate({ current: 0, next: 1, assigned: [] });
  };

  const skipToken = () => {
    const assigned = tokenQueue.assigned || [];
    const current = tokenQueue.current || 0;
    const served = assigned.filter(t => t <= current);
    let waiting = assigned.filter(t => t > current);
    if (waiting.length === 0) return;
    const skipT = waiting.shift();
    const insertAt = Math.min(5, waiting.length);
    waiting.splice(insertAt, 0, skipT);
    saveTokenMutation.mutate({ ...tokenQueue, assigned: [...served, ...waiting] });
  };

  const backToken = () => {
    const current = tokenQueue.current || 0;
    if (current <= 0) return;
    saveTokenMutation.mutate({ ...tokenQueue, current: current - 1, assigned: [current, ...(tokenQueue.assigned || [])] });
  };

  const confirmDeleteToken = () => {
    if (!deletingToken) return;
    const newAssigned = (tokenQueue.assigned || []).filter(t => t !== deletingToken);
    saveTokenMutation.mutate({ ...tokenQueue, current: (tokenQueue.current || 0) + 1, assigned: newAssigned });
    setDeletingToken(null);
  };

  const waitingCount = (tokenQueue.assigned || []).filter(t => t > (tokenQueue.current || 0)).length;
  const firstWaiting = (tokenQueue.assigned || []).filter(t => t > (tokenQueue.current || 0))[0];

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setMode('table')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            mode === 'table'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Table Mode
        </button>
        <button
          onClick={() => setMode('token')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            mode === 'token'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Token Mode
        </button>
      </div>

      {mode === 'table' ? (
        <>
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

                    <div className="flex justify-center mb-4">
                      <div className="inline-block">
                        {url && (
                          <QRCodeCanvas
                            ref={(node) => setQrRef(table.number, node)}
                            value={url}
                            size={180}
                            level="M"
                            includeMargin
                          />
                        )}
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
        </>
      ) : (
        /* Token Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Token Queue</h1>
                <p className="text-xs text-gray-500">Manage walk-in token queue</p>
              </div>
            </div>
          </div>

          {/* Now Serving + Queue Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Now Serving</p>
              <div className="text-5xl font-black text-violet-600 mb-3">
                #{String(tokenQueue.current || 0).padStart(3, '0')}
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={() => setDeletingToken(tokenQueue.current)}
                  disabled={(tokenQueue.current || 0) <= 0 || saveTokenMutation.isPending}
                  className="px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  onClick={skipToken}
                  disabled={!firstWaiting || saveTokenMutation.isPending}
                  className="px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip
                </button>
                <button
                  onClick={backToken}
                  disabled={(tokenQueue.current || 0) <= 0 || saveTokenMutation.isPending}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={advanceToken}
                  disabled={!firstWaiting || saveTokenMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl font-bold text-sm hover:from-violet-600 hover:to-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg shadow-violet-200"
                >
                  <SkipForward className="w-4 h-4" />
                  Next →
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Queue Status</p>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{waitingCount}</p>
                  <p className="text-xs text-gray-400">Waiting</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">#{String(tokenQueue.next || 1).padStart(3, '0')}</p>
                  <p className="text-xs text-gray-400">Next Token</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{(tokenQueue.assigned || []).length}</p>
                  <p className="text-xs text-gray-400">Assigned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Waiting Queue */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Token Queue</h3>
              <button
                onClick={resetTokenQueue}
                disabled={saveTokenMutation.isPending}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Queue
              </button>
            </div>
            {waitingCount === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tokens waiting</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(tokenQueue.assigned || [])
                  .filter(t => t > (tokenQueue.current || 0))
                  .map(t => (
                    <div key={t} className="px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl text-sm font-bold text-violet-700">
                      #{String(t).padStart(3, '0')}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Token QR */}
          {publicSlug?.slug && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Token QR Code</h3>
              <p className="text-xs text-gray-400 mb-4">Customers scan this to get a token</p>
              <div className="flex flex-col items-center">
                <div className="inline-block mb-4">
                  <QRCodeCanvas
                    ref={(node) => setQrRef('token', node)}
                    value={getTokenUrl()}
                    size={180}
                    level="M"
                    includeMargin
                  />
                </div>
                <div className="flex gap-3 w-full max-w-sm">
                  <button
                    onClick={copyTokenLink}
                    className="flex-1 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={downloadTokenQR}
                    className="flex-1 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-sm font-bold text-violet-600 hover:bg-violet-100 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <Download className="w-4 h-4" />
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          )}
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
      <ConfirmDialog
        open={!!deletingToken}
        onClose={() => setDeletingToken(null)}
        onConfirm={confirmDeleteToken}
        title={`Delete Token #${String(deletingToken || '').padStart(3, '0')}?`}
        message="This will remove this token from the queue entirely. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={saveTokenMutation.isPending}
      />
    </div>
  );
}
