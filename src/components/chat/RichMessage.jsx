import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShoppingBag, Check, Camera } from 'lucide-react';

import { API_BASE } from '../../api/config';

function extractFileId(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) {
    const photo = img.find(m => m.type === 'photo' || m.file_id);
    return photo?.file_id || photo || '';
  }
  return img.file_id || '';
}

function getImageUrl(fileId, botId) {
  const id = extractFileId(fileId);
  if (!id) return '';
  if (id.startsWith('http') || id.startsWith('data:')) return id;
  if (!botId || botId === 'the_bot_id') return '';
  return `${API_BASE}/telegram/file/${encodeURIComponent(id)}?bot_id=${botId}`;
}

function parseRichMessage(text) {
  if (!text) return [{ type: 'text', content: '' }];
  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    const startIdx = remaining.indexOf('<!--C ');
    if (startIdx === -1) break;

    const before = remaining.slice(0, startIdx);
    if (before.trim()) segments.push({ type: 'text', content: before });

    const afterStart = remaining.slice(startIdx + 6);
    const typeEnd = afterStart.indexOf('-->');
    if (typeEnd === -1) break;

    const type = afterStart.slice(0, typeEnd).trim();
    const afterType = afterStart.slice(typeEnd + 3);
    const blockEnd = afterType.indexOf('<!--C-->');
    if (blockEnd === -1) break;

    const jsonStr = afterType.slice(0, blockEnd).trim();
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        segments.push({ type, data });
      } catch {
        segments.push({ type: 'text', content: '<!--C ' + type + '-->' + jsonStr + '<!--C-->' });
      }
    }
    remaining = afterType.slice(blockEnd + 7);
  }

  if (remaining.trim()) segments.push({ type: 'text', content: remaining });
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

function ProductCard({ data, onAction, theme, botId, getProductUrl }) {
  const imgUrl = getImageUrl(data.image, botId);
  const productUrl = getProductUrl?.(data.id);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white my-2 shadow-sm">
      {imgUrl && (
        <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
          <img src={imgUrl} alt={data.name} className="w-full h-full object-contain" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <h4 className="font-bold text-gray-900 text-sm">{data.name}</h4>
        <p className="text-lg font-bold mt-1" style={{ color: theme?.css?.['--theme-price'] || '#059669' }}>
          {Number(data.price).toLocaleString()} MMK
        </p>
        {productUrl ? (
          <a href={productUrl}
            className="block w-full mt-2 py-2 rounded-xl text-sm font-bold text-white text-center transition-all active:scale-95"
            style={{ background: theme?.css?.['--theme-btn'] || '#6366f1' }}>
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> View Product
          </a>
        ) : (
          <button onClick={() => onAction('view_product', String(data.id))}
            className="w-full mt-2 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: theme?.css?.['--theme-btn'] || '#6366f1' }}>
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> View Product
          </button>
        )}
      </div>
    </div>
  );
}

const RichButtons = React.memo(function RichButtons({ data, onAction, theme }) {
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {(data.options || []).map((opt, i) => (
        <button key={i}
          onClick={() => onAction(data.id || 'action', opt.value !== undefined ? String(opt.value) : String(opt))}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={opt.primary !== false
            ? { background: theme?.css?.['--theme-btn'] || '#6366f1', color: '#fff' }
            : { background: '#f3f4f6', color: '#374151' }
          }>
          {opt.label || opt.icon || opt}
        </button>
      ))}
    </div>
  );
});

function PaymentInfo({ data, botId }) {
  const qrUrl = getImageUrl(data.qr_code, botId);
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 my-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment</p>
      <p className="text-sm font-bold text-gray-900">{data.name}</p>
      {data.account_number && (
        <p className="text-sm text-gray-700 mt-0.5">Account: <span className="font-mono font-bold">{data.account_number}</span></p>
      )}
      {data.account_name && <p className="text-xs text-gray-500">Name: {data.account_name}</p>}
      {qrUrl && (
        <div className="mt-2 flex justify-center">
          <img src={qrUrl} alt="QR Code" className="w-32 h-32 rounded-lg border border-gray-200" loading="lazy" />
        </div>
      )}
    </div>
  );
}

const ChatForm = React.memo(function ChatForm({ data, onSubmit }) {
  const [values, setValues] = React.useState({});
  const [files, setFiles] = React.useState(null);

  const fields = data.fields || [];
  const handleSubmit = (e) => {
    e.preventDefault();
    const required = fields.filter(f => f.required);
    const missing = required.filter(f => !values[f.name]?.trim());
    if (missing.length > 0) return;
    onSubmit(values, files);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-3 bg-white my-2 space-y-2.5">
      {fields.map(f => (
        <div key={f.name}>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            {f.label || f.name} {f.required && <span className="text-rose-500">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea value={values[f.name] || ''} onChange={e => setValues(p => ({ ...p, [f.name]: e.target.value }))}
              placeholder={f.placeholder || ''} rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          ) : (
            <input type={f.type || 'text'} value={values[f.name] || ''}
              onChange={e => setValues(p => ({ ...p, [f.name]: e.target.value }))}
              placeholder={f.placeholder || ''}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          )}
        </div>
      ))}
      {data.require_photo && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Screenshot {data.photo_required !== false && <span className="text-rose-500">*</span>}</label>
          <input type="file" accept="image/*"
            onChange={e => setFiles(e.target.files[0])}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
        </div>
      )}
      <button type="submit"
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
        style={{ background: '#6366f1' }}>
        <Check className="w-4 h-4 inline mr-1 -mt-0.5" /> {data.submit_label || 'Confirm'}
      </button>
    </form>
  );
});

function OrderSummary({ data }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-green-50 my-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
        <p className="font-bold text-green-800 text-sm">Order Placed!</p>
      </div>
      {data.order_id && <p className="text-xs text-green-700 font-mono font-bold">#{data.order_id}</p>}
      {data.product && <p className="text-sm text-green-800 mt-1">{data.product}</p>}
      {data.total && <p className="font-bold text-green-800 mt-1">{Number(data.total).toLocaleString()} MMK</p>}
      {data.status && (
        <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">{data.status}</span>
        </div>
      )}
    </div>
  );
}

function CreateOrder({ data, botId }) {
  const [state, setState] = React.useState('creating');
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!botId || state !== 'creating') return;
    setState('loading');
    const item = data.product || {};
    fetch(`${API_BASE}/public/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: botId,
        customer_name: data.customer?.name || '',
        phone: data.customer?.phone || '',
        address: data.customer?.address || '',
        items: [{ name: item.name || 'Product', price: Number(item.price) || 0, quantity: 1 }],
        total_amount: Number(item.price) || 0,
        payment_method: data.payment_method || '',
        payment_proof: data.payment_screenshot || '',
      }),
    }).then(r => r.json()).then(d => {
      setResult(d);
      setState('done');
    }).catch(() => {
      setError('Failed to create order. Please try again.');
      setState('error');
    });
  }, [botId, state, data]);

  if (state === 'loading') {
    return (
      <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 my-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Creating your order...</p>
        </div>
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="border border-gray-200 rounded-xl p-3 bg-green-50 my-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-green-800 text-sm">Order Placed!</p>
        </div>
        <p className="text-xs text-green-700 font-mono font-bold">#{result.order_number || result.order_id || 'N/A'}</p>
        {data.product?.name && <p className="text-sm text-green-800 mt-1">{data.product.name}</p>}
        <p className="font-bold text-green-800 mt-1">{Number(data.product?.price || 0).toLocaleString()} MMK</p>
        <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Pending Review</span>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return <p className="text-sm text-rose-600 my-2">{error}</p>;
  }

  return null;
}

const FileUploadButton = React.memo(function FileUploadButton({ data, onUpload }) {
  const inputRef = React.useRef(null);
  return (
    <div className="my-2">
      <input ref={inputRef} type="file" accept={data.accept || 'image/*'} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      <button onClick={() => inputRef.current?.click()}
        className="w-full py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95">
        <Camera className="w-4 h-4 inline mr-1.5 -mt-0.5" /> {data.label || 'Upload Screenshot'}
      </button>
    </div>
  );
});

function MarkdownBlock({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-indigo-600 font-medium hover:underline">{children}</a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) return <code className="bg-gray-200 rounded px-1 py-0.5 text-xs">{children}</code>;
            return <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code {...props}>{children}</code></pre>;
          },
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 my-2 italic text-gray-600">{children}</blockquote>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse border border-gray-300">{children}</table></div>
          ),
          th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
          hr: () => <hr className="my-3 border-gray-300" />,
        }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const RichMessage = React.memo(function RichMessage({ content, onAction, onFormSubmit, onFileUpload, theme, isAssistant, botId, getProductUrl }) {
  const segments = parseRichMessage(content);
  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'text':
        return <MarkdownBlock key={i} content={seg.content} />;
      case 'product_card':
        return isAssistant ? <ProductCard key={i} data={seg.data} onAction={onAction} theme={theme} botId={botId} getProductUrl={getProductUrl} /> : null;
      case 'buttons':
        return isAssistant ? <RichButtons key={i} data={seg.data} onAction={onAction} theme={theme} /> : null;
      case 'payment_info':
        return isAssistant ? <PaymentInfo key={i} data={seg.data} botId={botId} /> : null;
      case 'form':
        return isAssistant ? <ChatForm key={i} data={seg.data} onSubmit={(vals, file) => onFormSubmit?.(seg.data.id || 'form', vals, file)} /> : null;
      case 'file_upload':
        return isAssistant ? <FileUploadButton key={i} data={seg.data} onUpload={(f) => onFileUpload?.(seg.data.id || 'upload', f)} /> : null;
      case 'order_summary':
        return isAssistant ? <OrderSummary key={i} data={seg.data} /> : null;
      case 'create_order':
        return isAssistant ? <CreateOrder key={i} data={seg.data} botId={botId} /> : null;
      default:
        return null;
    }
  });
});
