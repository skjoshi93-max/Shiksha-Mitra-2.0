import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { sanitizeMathAndChemistryText } from '../../lib/mathSanitizer';

interface MathRendererProps {
  text: string;
  className?: string;
  id?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '', id }) => {
  if (!text || typeof text !== 'string') return null;

  // Process text with LaTeX and chemistry sanitizer
  const sanitized = useMemo(() => sanitizeMathAndChemistryText(text), [text]);

  // Parse and split by LaTeX delimiters $...$ (inline) and $$...$$ (display/block)
  const elements = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(sanitized)) !== null) {
      // Add preceding plain text
      if (match.index > lastIndex) {
        const plainText = sanitized.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {plainText}
          </span>
        );
      }

      const rawFormula = match[0];
      const isDisplay = rawFormula.startsWith('$$') && rawFormula.endsWith('$$');
      const formula = isDisplay
        ? rawFormula.slice(2, -2).trim()
        : rawFormula.slice(1, -1).trim();

      try {
        const html = katex.renderToString(formula, {
          displayMode: isDisplay,
          throwOnError: false,
        });

        if (isDisplay) {
          parts.push(
            <div
              key={`math-block-${match.index}`}
              className="my-3 block text-center overflow-x-auto py-1.5 px-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else {
          parts.push(
            <span
              key={`math-inline-${match.index}`}
              className="inline-block px-1 align-baseline font-normal"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch (_e) {
        parts.push(
          <span
            key={`math-fallback-${match.index}`}
            className="font-mono text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded"
          >
            {rawFormula}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < sanitized.length) {
      parts.push(
        <span key={`text-end`} className="whitespace-pre-wrap">
          {sanitized.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [sanitized]);

  return (
    <span id={id} className={`inline leading-relaxed ${className}`}>
      {elements.length > 0 ? elements : sanitized}
    </span>
  );
};
