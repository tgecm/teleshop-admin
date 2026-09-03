import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ children, className = '', isAdmin = false, isAssistant = false }) {
  if (!children) return null;
  if (!isAssistant) {
    return (
      <div className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${className}`}>
        {linkifyText(children)}
      </div>
    );
  }
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
          ol: ({ children, start }) => <ol start={start} className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
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
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]{2,}|t\.me\/[^\s<]+)/gi;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchText = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    let href = matchText;
    if (!href.match(/^https?:\/\//i)) {
      href = 'https://' + href;
    }

    elements.push(
      <a
        key={matchIndex}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline break-all cursor-pointer underline decoration-indigo-400 decoration-1 underline-offset-2 select-text"
      >
        {matchText}
      </a>
    );

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}
