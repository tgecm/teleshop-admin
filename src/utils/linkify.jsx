import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ children, className = '', isAdmin = false }) {
  if (!children) return null;
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className={`font-medium hover:underline ${isAdmin ? 'text-indigo-200' : 'text-indigo-600'}`}>
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-gray-200 rounded px-1 py-0.5 text-xs">{children}</code>;
            }
            return (
              <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs">
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          },
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 my-2 italic text-gray-600">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-gray-300">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
          hr: () => <hr className="my-3 border-gray-300" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

export function linkifyText(text) {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s<]+)|((?:www\.)[^\s<]+\.[^\s<]{2,})|([a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z]{2,})+(?:\/[^\s<]*)?)/gi;
  const parts = text.split(urlRegex).filter(Boolean);
  if (parts.length === 0) return text;
  return parts.map((part, i) => {
    if (part.match(/^https?:\/\//i)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^www\./i)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    return part;
  });
}
