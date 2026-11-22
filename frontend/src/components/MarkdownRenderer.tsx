"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown:
 * - **bold**
 * - *italic* or _italic_
 * - `code`
 * - [link](url)
 * - Escaped asterisks \*
 */
export function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Tokenize string with regex capturing: bold, inline code, links, italic, escaped asterisks
  const regex = /(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\)|\*.*?\*|\\?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {renderInline(inner)}
        </strong>
      );
    }

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200/80 font-medium"
        >
          {inner}
        </code>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-700 underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Italic: *text* (excluding escaped \*)
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 3 && !part.startsWith("\\*")) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-slate-700">
          {renderInline(inner)}
        </em>
      );
    }

    // Escaped asterisk: \*
    if (part === "\\*") {
      return <span key={index}>*</span>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Checks if a string line is part of a markdown table.
 */
function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

/**
 * Parses markdown table rows into headers, alignment, and data rows.
 */
function parseTable(lines: string[]): {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
} | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    const trimmed = line.trim();
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());
    return cells;
  };

  const headers = parseRow(lines[0]);
  const separatorRow = parseRow(lines[1]);

  if (headers.length === 0 || separatorRow.length === 0) return null;

  // Verify separator contains hyphens
  const isSeparator = separatorRow.every((c) => /^:?-+:?$/.test(c.trim()));
  if (!isSeparator) return null;

  const alignments: ("left" | "center" | "right")[] = separatorRow.map((c) => {
    const cell = c.trim();
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseRow(lines[i]);
    // Pad cells if row has fewer columns
    while (cells.length < headers.length) {
      cells.push("");
    }
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, alignments, rows };
}

/**
 * Main MarkdownRenderer Component
 * Converts markdown text with GitHub Flavored Tables, Headings, Lists, Quotes, Code Blocks into
 * high-polish Tailwind React elements.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const rawLines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  let elementKey = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Skip Empty Lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block (```lang ... ```)
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      const lang = trimmed.slice(3).trim();
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++; // Consume closing ```

      elements.push(
        <div
          key={elementKey++}
          className="my-3 rounded-xl border border-slate-200 bg-slate-900 overflow-hidden shadow-xs"
        >
          {lang && (
            <div className="px-3.5 py-1.5 bg-slate-800 text-slate-400 text-[10px] font-mono border-b border-slate-700/60 uppercase tracking-wider flex items-center justify-between">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto selection:bg-indigo-500 selection:text-white">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 3. Markdown Table (| Header | Header |)
    if (isTableLine(trimmed)) {
      const tableLines: string[] = [];
      while (i < rawLines.length && isTableLine(rawLines[i])) {
        tableLines.push(rawLines[i]);
        i++;
      }

      const tableData = parseTable(tableLines);
      if (tableData) {
        elements.push(
          <div
            key={elementKey++}
            className="my-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
                    {tableData.headers.map((h, colIdx) => {
                      const align = tableData.alignments[colIdx] || "left";
                      const alignClass =
                        align === "right"
                          ? "text-right"
                          : align === "center"
                          ? "text-center"
                          : "text-left";
                      return (
                        <th
                          key={colIdx}
                          className={`py-2.5 px-3.5 text-xs tracking-tight uppercase text-[11px] font-bold text-slate-600 whitespace-nowrap ${alignClass}`}
                        >
                          {renderInline(h)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {tableData.rows.map((row, rowIdx) => {
                    const isTotalRow = row.some((cell) =>
                      cell.toLowerCase().includes("total")
                    );
                    return (
                      <tr
                        key={rowIdx}
                        className={`transition-colors ${
                          isTotalRow
                            ? "bg-indigo-50/40 font-bold text-indigo-950 border-t border-indigo-100"
                            : rowIdx % 2 === 1
                            ? "bg-slate-50/40 hover:bg-slate-100/60"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {row.map((cell, colIdx) => {
                          const align = tableData.alignments[colIdx] || "left";
                          const alignClass =
                            align === "right"
                              ? "text-right"
                              : align === "center"
                              ? "text-center"
                              : "text-left";
                          return (
                            <td
                              key={colIdx}
                              className={`py-2 px-3.5 text-slate-800 text-xs whitespace-nowrap ${alignClass}`}
                            >
                              {renderInline(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }
    }

    // 4. Horizontal Rule (--- or ***)
    if (/^(\*{3,}|-{3,})$/.test(trimmed)) {
      elements.push(<hr key={elementKey++} className="my-3 border-slate-200" />);
      i++;
      continue;
    }

    // 5. Headings (#, ##, ###, ####)
    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4 key={elementKey++} className="text-xs font-bold text-slate-800 mt-2.5 mb-1 tracking-tight">
          {renderInline(trimmed.slice(5))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={elementKey++}
          className="text-sm font-bold text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5 tracking-tight"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={elementKey++} className="text-base font-bold text-slate-900 mt-3.5 mb-2 tracking-tight">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={elementKey++} className="text-lg font-extrabold text-slate-900 mt-4 mb-2 tracking-tight">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // 6. Blockquotes (> text)
    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={elementKey++}
          className="my-2.5 pl-3.5 py-1 border-l-3 border-indigo-400 text-slate-600 bg-indigo-50/20 rounded-r-lg text-xs italic"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // 7. Bullet Lists (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < rawLines.length && /^[-*]\s+/.test(rawLines[i].trim())) {
        listItems.push(rawLines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={elementKey++} className="my-2 space-y-1.5 text-xs text-slate-700 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Numbered Lists (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < rawLines.length && /^\d+\.\s+/.test(rawLines[i].trim())) {
        const match = rawLines[i].trim().match(/^(\d+)\.\s+(.*)$/);
        if (match) {
          listItems.push({ num: match[1], text: match[2] });
        }
        i++;
      }
      elements.push(
        <ol key={elementKey++} className="my-2 space-y-1.5 text-xs text-slate-700 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="font-bold text-indigo-600 shrink-0 text-[11px] min-w-[16px]">
                {item.num}.
              </span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Standard Paragraph
    const paraLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith("#") &&
      !rawLines[i].trim().startsWith("```") &&
      !isTableLine(rawLines[i]) &&
      !/^[-*]\s+/.test(rawLines[i].trim()) &&
      !/^\d+\.\s+/.test(rawLines[i].trim()) &&
      !rawLines[i].trim().startsWith("> ") &&
      !/^(\*{3,}|-{3,})$/.test(rawLines[i].trim())
    ) {
      paraLines.push(rawLines[i]);
      i++;
    }

    elements.push(
      <p key={elementKey++} className="leading-relaxed my-1.5 text-slate-700 text-xs">
        {renderInline(paraLines.join(" "))}
      </p>
    );
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
