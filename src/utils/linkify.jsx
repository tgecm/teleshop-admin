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
