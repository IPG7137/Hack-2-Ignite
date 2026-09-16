import React from 'react';

interface CopilotMarkdownProps {
  content: string;
  isUser?: boolean;
  onSelectComplaint?: (complaintId: string) => void;
  className?: string;
}

/**
 * Pure, safe React Markdown parser and renderer designed specifically for CivicResolve Copilot.
 * Operates without dangerouslySetInnerHTML to guarantee 0 XSS vulnerabilities while properly
 * rendering headings, bold/italics, lists, blockquotes, code blocks, and interactive complaint citation pills.
 */
export const CopilotMarkdown: React.FC<CopilotMarkdownProps> = ({
  content,
  isUser = false,
  onSelectComplaint,
  className = '',
}) => {
  if (!content) return null;

  // Render inline formatting (bold, italic, code, complaint pills, links)
  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let index = 0;

    while (remaining.length > 0) {
      // 1. Complaint Citation Pill: e.g. #CR-101, #comp-1, #c-road-1, #CR-3, #123
      const complaintMatch = remaining.match(/^(?:#)(CR-[\w-]+|c-[\w-]+|comp-[\w-]+|\d+)/i);
      if (complaintMatch) {
        const fullToken = complaintMatch[0];
        const complaintId = complaintMatch[1];
        if (onSelectComplaint) {
          nodes.push(
            <button
              key={`${keyPrefix}-pill-${index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectComplaint(complaintId);
              }}
              className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-mono text-[10px] font-bold transition-all shadow-2xs ${
                isUser
                  ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  : 'bg-blue-50 hover:bg-blue-100 text-[#1769D2] border border-blue-200 hover:border-blue-300'
              }`}
              title={`Inspect complaint #${complaintId}`}
            >
              #{complaintId}
            </button>
          );
        } else {
          nodes.push(
            <span
              key={`${keyPrefix}-pill-${index}`}
              className={`inline-block font-mono font-bold px-1 py-0.2 rounded text-[10px] ${
                isUser ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1769D2] border border-blue-200'
              }`}
            >
              #{complaintId}
            </span>
          );
        }
        remaining = remaining.slice(fullToken.length);
        index++;
        continue;
      }

      // 2. Bold with Asterisks: **bold** or __bold__
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        const innerText = boldMatch[2];
        nodes.push(
          <strong
            key={`${keyPrefix}-bold-${index}`}
            className={`font-bold ${isUser ? 'text-white' : 'text-[#172B4D]'}`}
          >
            {renderInline(innerText, `${keyPrefix}-b-${index}`)}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        index++;
        continue;
      }

      // 3. Inline Code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        const codeText = codeMatch[1];
        nodes.push(
          <code
            key={`${keyPrefix}-code-${index}`}
            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
              isUser
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-slate-100 text-[#172B4D] border border-slate-200'
            }`}
          >
            {codeText}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        index++;
        continue;
      }

      // 4. Italic with single asterisk or underscore: *italic* or _italic_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+?)\1/);
      if (italicMatch) {
        const innerText = italicMatch[2];
        nodes.push(
          <em
            key={`${keyPrefix}-italic-${index}`}
            className={`italic ${isUser ? 'text-white/90' : 'text-[#526581]'}`}
          >
            {renderInline(innerText, `${keyPrefix}-i-${index}`)}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        index++;
        continue;
      }

      // 5. Strikethrough: ~~del~~
      const strikeMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        const innerText = strikeMatch[1];
        nodes.push(
          <del key={`${keyPrefix}-strike-${index}`} className="line-through opacity-70">
            {renderInline(innerText, `${keyPrefix}-s-${index}`)}
          </del>
        );
        remaining = remaining.slice(strikeMatch[0].length);
        index++;
        continue;
      }

      // 6. Regular Plain Text slice until next special markdown character
      const nextSpecial = remaining.search(/[\*\_`#~]/);
      if (nextSpecial === -1) {
        nodes.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Character wasn't part of a valid formatting pair, consume single character
        nodes.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        nodes.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
      index++;
    }

    return nodes;
  };

  // Block Lexer: Parse multi-line string into structured blocks (Headings, Lists, Blockquotes, Paragraphs, Code Blocks, HR)
  const renderBlocks = (): React.ReactNode[] => {
    const blocks: React.ReactNode[] = [];
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let lineIdx = 0;

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        lineIdx++;
        continue;
      }

      // 1. Code Block (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        lineIdx++;
        while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
          codeLines.push(lines[lineIdx]);
          lineIdx++;
        }
        if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('```')) {
          lineIdx++;
        }
        blocks.push(
          <div key={`codeblock-${lineIdx}`} className="my-2 rounded-lg bg-slate-900 border border-slate-800 p-3 overflow-x-auto shadow-xs">
            {lang && <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">{lang}</div>}
            <pre className="text-slate-100 font-mono text-xs leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 2. Horizontal Rule (--- or ***)
      if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
        blocks.push(
          <hr
            key={`hr-${lineIdx}`}
            className={`my-2.5 border-t ${isUser ? 'border-white/20' : 'border-[#E8EEF5]'}`}
          />
        );
        lineIdx++;
        continue;
      }

      // 3. Headings (#, ##, ###, ####, #####)
      const headingMatch = trimmed.match(/^(#{1,5})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];

        if (level === 1) {
          blocks.push(
            <h1
              key={`h1-${lineIdx}`}
              className={`text-sm sm:text-base font-bold pb-1.5 mb-2 border-b ${
                isUser ? 'text-white border-white/20' : 'text-[#172B4D] border-slate-200'
              }`}
            >
              {renderInline(headingText, `h1-${lineIdx}`)}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2
              key={`h2-${lineIdx}`}
              className={`text-xs sm:text-sm font-bold pb-1 mb-1.5 ${
                isUser ? 'text-white' : 'text-[#172B4D]'
              }`}
            >
              {renderInline(headingText, `h2-${lineIdx}`)}
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h3-${lineIdx}`}
              className={`text-xs sm:text-sm font-bold pb-1 mb-1.5 border-b ${
                isUser ? 'text-white border-white/20' : 'text-[#172B4D] border-slate-100'
              }`}
            >
              {renderInline(headingText, `h3-${lineIdx}`)}
            </h3>
          );
        } else if (level === 4) {
          blocks.push(
            <h4
              key={`h4-${lineIdx}`}
              className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1 pt-1 ${
                isUser ? 'text-white/90' : 'text-[#1769D2]'
              }`}
            >
              {renderInline(headingText, `h4-${lineIdx}`)}
            </h4>
          );
        } else {
          blocks.push(
            <h5
              key={`h5-${lineIdx}`}
              className={`text-[11px] font-semibold mb-1 ${
                isUser ? 'text-white/80' : 'text-[#526581]'
              }`}
            >
              {renderInline(headingText, `h5-${lineIdx}`)}
            </h5>
          );
        }
        lineIdx++;
        continue;
      }

      // 4. Blockquote (> ...)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
          quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
          lineIdx++;
        }
        blocks.push(
          <blockquote
            key={`quote-${lineIdx}`}
            className={`pl-3 my-1.5 py-1 rounded-r border-l-2 text-xs leading-relaxed italic ${
              isUser
                ? 'border-white/50 bg-white/10 text-white/90'
                : 'border-[#1769D2] bg-slate-50 text-[#526581]'
            }`}
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={`ql-${qIdx}`}>{renderInline(ql, `quote-${lineIdx}-${qIdx}`)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // 5. Unordered List Items (- , * , • )
      if (/^[-*•]\s+/.test(trimmed) || /^\s+[-*•]\s+/.test(line)) {
        const listItems: Array<{ indent: number; text: string }> = [];
        while (
          lineIdx < lines.length &&
          (/^[-*•]\s+/.test(lines[lineIdx].trim()) || /^\s+[-*•]\s+/.test(lines[lineIdx]))
        ) {
          const l = lines[lineIdx];
          const indent = l.search(/\S/) >= 2 ? 1 : 0;
          const text = l.trim().replace(/^[-*•]\s+/, '');
          listItems.push({ indent, text });
          lineIdx++;
        }

        blocks.push(
          <ul key={`ul-${lineIdx}`} className="space-y-1 my-1.5">
            {listItems.map((item, iIdx) => (
              <li
                key={`li-${lineIdx}-${iIdx}`}
                className={`flex items-start gap-1.5 leading-relaxed text-xs ${
                  item.indent > 0 ? 'ml-4' : ''
                }`}
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    isUser ? 'bg-white' : 'bg-[#1769D2]'
                  }`}
                />
                <div className="flex-1">
                  {renderInline(item.text, `ul-li-${lineIdx}-${iIdx}`)}
                </div>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 6. Ordered List Items (1. , 2. )
      if (/^\d+\.\s+/.test(trimmed)) {
        const listItems: Array<{ num: string; text: string }> = [];
        while (lineIdx < lines.length && /^\d+\.\s+/.test(lines[lineIdx].trim())) {
          const l = lines[lineIdx].trim();
          const match = l.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            listItems.push({ num: match[1], text: match[2] });
          }
          lineIdx++;
        }

        blocks.push(
          <ol key={`ol-${lineIdx}`} className="space-y-1 my-1.5 list-none">
            {listItems.map((item, iIdx) => (
              <li
                key={`oli-${lineIdx}-${iIdx}`}
                className="flex items-start gap-1.5 leading-relaxed text-xs"
              >
                <span
                  className={`font-mono text-[11px] font-bold shrink-0 min-w-[1.2rem] ${
                    isUser ? 'text-white/80' : 'text-[#1769D2]'
                  }`}
                >
                  {item.num}.
                </span>
                <div className="flex-1">
                  {renderInline(item.text, `ol-li-${lineIdx}-${iIdx}`)}
                </div>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 7. Regular Paragraph
      const paraLines: string[] = [];
      while (
        lineIdx < lines.length &&
        lines[lineIdx].trim() &&
        !lines[lineIdx].trim().startsWith('#') &&
        !lines[lineIdx].trim().startsWith('```') &&
        !lines[lineIdx].trim().startsWith('>') &&
        !/^[-*•]\s+/.test(lines[lineIdx].trim()) &&
        !/^\d+\.\s+/.test(lines[lineIdx].trim()) &&
        !/^(\-{3,}|\*{3,})$/.test(lines[lineIdx].trim())
      ) {
        paraLines.push(lines[lineIdx].trim());
        lineIdx++;
      }

      if (paraLines.length > 0) {
        blocks.push(
          <p key={`p-${lineIdx}`} className="leading-relaxed text-xs my-1">
            {renderInline(paraLines.join(' '), `p-${lineIdx}`)}
          </p>
        );
      }
    }

    return blocks;
  };

  return (
    <div className={`copilot-markdown font-sans space-y-1.5 ${className}`}>
      {renderBlocks()}
    </div>
  );
};
