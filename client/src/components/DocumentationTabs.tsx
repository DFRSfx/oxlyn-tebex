import React, { useState } from 'react';
import { DocumentationResource, DocumentationSection } from '../types';
import { Copy, Check } from 'lucide-react';

interface DocumentationTabsProps {
  resource: DocumentationResource;
}

const DocumentationTabs: React.FC<DocumentationTabsProps> = ({ resource }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  if (!resource.subsections || resource.subsections.length === 0) {
    return <div className="text-white/60">No documentation available</div>;
  }

  const activeSubsection = resource.subsections[activeTab];

  const copyToClipboard = (text: string, codeIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeIndex);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getLanguageColor = (language: string | null) => {
    const lang = (language || '').toLowerCase();
    const colorMap: { [key: string]: string } = {
      lua: 'from-blue-500 to-blue-600',
      javascript: 'from-yellow-500 to-yellow-600',
      typescript: 'from-blue-400 to-blue-500',
      python: 'from-blue-600 to-yellow-500',
      json: 'from-orange-500 to-orange-600',
      html: 'from-red-500 to-red-600',
      css: 'from-blue-500 to-purple-600',
      cfg: 'from-gray-500 to-gray-600',
      sql: 'from-cyan-500 to-cyan-600',
      bash: 'from-green-600 to-green-700',
      shell: 'from-green-600 to-green-700',
    };
    return colorMap[lang] || 'from-primary-orange to-orange-600';
  };

  const detectCodeLanguage = (code: string): string => {
    // Detect language based on code patterns
    if (/\b(local|function|end|then|elseif)\b/.test(code)) return 'lua';
    if (/^[\s]*[{[]/.test(code) && /[}\]][\s]*$/.test(code)) return 'json';
    if (/\b(const|let|var|function|=>|import|export)\b/.test(code)) return 'javascript';
    if (/\b(Config\.|exports\.|RegisterCommand|AddEventHandler)\b/.test(code)) return 'lua';
    return 'code';
  };

  const isCodeLine = (line: string): boolean => {
    const trimmed = line.trim();
    // Check for common code patterns
    return (
      trimmed.startsWith('local ') ||
      trimmed.startsWith('function ') ||
      trimmed.startsWith('Config.') ||
      trimmed.startsWith('exports.') ||
      trimmed.includes(' = {') ||
      trimmed.includes(' = function') ||
      /^[a-zA-Z_]\w*\s*=\s*.+/.test(trimmed) ||
      /^\s{4,}/.test(line) || // Indented 4+ spaces
      trimmed.startsWith('return ') ||
      trimmed.startsWith('if ') ||
      trimmed.startsWith('end')
    );
  };

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let codeBlock: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={elements.length} className="mb-4 text-white/80 leading-relaxed">
            {currentParagraph.join(' ')}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="mb-4 space-y-2 ml-2">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-primary-orange mt-1 shrink-0">•</span>
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlock.length > 0) {
        const code = codeBlock.join('\n');
        const language = detectCodeLanguage(code);
        elements.push(
          <div key={elements.length} className="mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed">
                <code>
                  {language === 'lua' ? (
                    <LuaSyntax code={code} />
                  ) : language === 'json' ? (
                    <JsonSyntax code={code} />
                  ) : (
                    <DefaultSyntax code={code} />
                  )}
                </code>
              </pre>
            </div>
          </div>
        );
        codeBlock = [];
      }
    };

    let inCodeBlock = false;

    lines.forEach((line, i) => {
      const trimmedLine = line.trim();

      // Detect start/end of code blocks
      const looksLikeCode = isCodeLine(line);
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const nextLooksLikeCode = isCodeLine(nextLine);

      // Start code block if we detect code
      if (looksLikeCode && !inCodeBlock) {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }

      // In code block
      if (inCodeBlock) {
        codeBlock.push(line);

        // End code block if next line doesn't look like code or is empty
        if (!nextLooksLikeCode && (nextLine.trim() === '' || i === lines.length - 1)) {
          flushCodeBlock();
          inCodeBlock = false;
        }
        return;
      }

      // Empty line - flush current paragraph/list
      if (trimmedLine === '') {
        flushParagraph();
        flushList();
        return;
      }

      // Section header (text ending with colon)
      if (trimmedLine.endsWith(':') && trimmedLine.length < 50 && !trimmedLine.includes('•')) {
        flushParagraph();
        flushList();
        elements.push(
          <h4 key={elements.length} className="text-lg font-bold text-white mt-6 mb-3">
            {trimmedLine}
          </h4>
        );
        return;
      }

      // Bullet point
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        flushParagraph();
        const cleanedItem = trimmedLine.replace(/^[•\-]\s*/, '');
        listItems.push(cleanedItem);
        return;
      }

      // Regular text - add to current paragraph
      flushList();
      if (trimmedLine) {
        currentParagraph.push(trimmedLine);
      }
    });

    // Flush any remaining content
    flushParagraph();
    flushList();
    flushCodeBlock();

    return <>{elements}</>;
  };

  const renderSection = (section: DocumentationSection, index: number) => {
    switch (section.type) {
      case 'text':
        return (
          <div key={index} className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">{section.title}</h3>
            <div className="text-base">
              {renderFormattedText(section.content)}
            </div>
          </div>
        );

      case 'code':
        const codeKey = `${index}-${section.id}`;
        const isCopied = copiedCode === index;
        return (
          <div key={index} className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">{section.title}</h3>
            <div className="relative">
              {/* Code Block Header */}
              <div className={`bg-gradient-to-r ${getLanguageColor(section.language)} rounded-t-lg p-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm uppercase tracking-wider">
                    {section.language || 'Code'}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(section.content, index)}
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition-all duration-200 text-sm font-medium"
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Code Block */}
              <pre className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-lg p-6 overflow-x-auto">
                <code className="text-sm font-mono leading-relaxed">
                  {/* Syntax highlighting based on language */}
                  {section.language === 'lua' ? (
                    <LuaSyntax code={section.content} />
                  ) : section.language === 'json' ? (
                    <JsonSyntax code={section.content} />
                  ) : (
                    <DefaultSyntax code={section.content} />
                  )}
                </code>
              </pre>
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={index} className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">{section.title}</h3>
            <img
              src={section.content}
              alt={section.title}
              className="rounded-lg max-w-full h-auto shadow-lg"
            />
          </div>
        );

      case 'video':
        return (
          <div key={index} className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">{section.title}</h3>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={section.content}
                title={section.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Mobile: Dropdown Selector */}
      <div className="md:hidden mb-8">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(Number(e.target.value))}
          className="w-full px-4 py-3 bg-zinc-800 border border-white/20 rounded-lg text-white font-medium appearance-none cursor-pointer hover:border-primary-orange/50 focus:border-primary-orange focus:outline-none transition-all duration-300"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23f97316' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            paddingRight: '2.5rem',
          }}
        >
          {resource.subsections.map((subsection, index) => (
            <option key={index} value={index}>
              {subsection.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tablet & Desktop: Segmented Control / Pills */}
      <div className="hidden md:flex flex-wrap gap-2 mb-8 p-2 bg-zinc-900/40 border border-white/10 rounded-xl">
        {resource.subsections.map((subsection, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 lg:px-6 lg:py-3 font-medium whitespace-nowrap rounded-lg transition-all duration-300 flex items-center gap-2 ${
              activeTab === index
                ? 'bg-gradient-to-r from-primary-orange to-orange-500 text-white shadow-lg shadow-primary-orange/20'
                : 'text-white/70 hover:text-white/90 hover:bg-white/5'
            }`}
          >
            <span className="text-base">{subsection.icon}</span>
            <span className="hidden sm:inline">{subsection.title}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeSubsection.sections.map((section, index) =>
          renderSection(section, index)
        )}
      </div>
    </div>
  );
};

// Simple syntax highlighting components for different languages
const LuaSyntax: React.FC<{ code: string }> = ({ code }) => {
  // Tokenize the code into parts
  const tokens: Array<{ type: string; value: string }> = [];
  let remaining = code;
  let match;

  const commentRegex = /^--[^\n]*/;
  const stringRegex = /^(['"][^'"]*['"])/;
  const keywordRegex = /^(local|function|end|if|then|else|elseif|for|do|while|return|true|false|nil|and|or|not|in)\b/;
  const whitespaceRegex = /^\s+/;
  const wordRegex = /^\w+/;

  while (remaining.length > 0) {
    if ((match = commentRegex.exec(remaining))) {
      tokens.push({ type: 'comment', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = stringRegex.exec(remaining))) {
      tokens.push({ type: 'string', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = keywordRegex.exec(remaining))) {
      tokens.push({ type: 'keyword', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = whitespaceRegex.exec(remaining))) {
      tokens.push({ type: 'whitespace', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = wordRegex.exec(remaining))) {
      tokens.push({ type: 'word', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else {
      tokens.push({ type: 'other', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'comment':
            return <span key={i} className="text-green-500">{token.value}</span>;
          case 'string':
            return <span key={i} className="text-amber-300">{token.value}</span>;
          case 'keyword':
            return <span key={i} className="text-blue-400 font-semibold">{token.value}</span>;
          default:
            return <span key={i}>{token.value}</span>;
        }
      })}
    </>
  );
};

const JsonSyntax: React.FC<{ code: string }> = ({ code }) => {
  const tokens: Array<{ type: string; value: string }> = [];
  let remaining = code;
  let match;

  const propRegex = /^"[^"]*"(?=\s*:)/;
  const stringRegex = /^"[^"]*"/;
  const numberRegex = /^\d+\.?\d*/;
  const booleanRegex = /^(true|false|null)/;
  const whitespaceRegex = /^\s+/;
  const otherRegex = /^./;

  while (remaining.length > 0) {
    if ((match = propRegex.exec(remaining))) {
      tokens.push({ type: 'property', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = stringRegex.exec(remaining))) {
      tokens.push({ type: 'string', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = numberRegex.exec(remaining))) {
      tokens.push({ type: 'number', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = booleanRegex.exec(remaining))) {
      tokens.push({ type: 'boolean', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = whitespaceRegex.exec(remaining))) {
      tokens.push({ type: 'whitespace', value: match[0] });
      remaining = remaining.slice(match[0].length);
    } else if ((match = otherRegex.exec(remaining))) {
      tokens.push({ type: 'other', value: match[0] });
      remaining = remaining.slice(1);
    }
  }

  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'property':
            return <span key={i} className="text-cyan-300">{token.value}</span>;
          case 'string':
            return <span key={i} className="text-amber-300">{token.value}</span>;
          case 'number':
            return <span key={i} className="text-green-400">{token.value}</span>;
          case 'boolean':
            return <span key={i} className="text-purple-400">{token.value}</span>;
          default:
            return <span key={i}>{token.value}</span>;
        }
      })}
    </>
  );
};

const DefaultSyntax: React.FC<{ code: string }> = ({ code }) => {
  // For other languages, just return the plain code with proper escaping
  return <>{code}</>;
};

export default DocumentationTabs;
