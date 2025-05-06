// src/components/markdown-toolbar.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Code, Quote } from 'lucide-react'; // Added Code and Quote
import { cn } from '@/lib/utils';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onApplyFormat: (newContent: string, newCursorPos?: number) => void;
  className?: string;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, onApplyFormat, className }) => {
  const applyFormat = (syntaxStart: string, syntaxEnd: string = syntaxStart, placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText, newCursorPos;

    if (selectedText) {
      // Wrap selected text
      newText = `${syntaxStart}${selectedText}${syntaxEnd}`;
      newCursorPos = start + syntaxStart.length + selectedText.length + syntaxEnd.length;
    } else {
      // Insert syntax with placeholder
      newText = `${syntaxStart}${placeholder}${syntaxEnd}`;
      newCursorPos = start + syntaxStart.length + (placeholder ? placeholder.length : 0);
    }

    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const finalContent = `${before}${newText}${after}`;

    onApplyFormat(finalContent, newCursorPos);

    // For placeholder, select the placeholder text after applying
    if (!selectedText && placeholder) {
      requestAnimationFrame(() => { // Ensure DOM update before selection
        textarea.setSelectionRange(start + syntaxStart.length, start + syntaxStart.length + placeholder.length);
      });
    }
  };

  const applyListFormat = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentLineStart = textarea.value.lastIndexOf('\n', start -1) + 1;
    const lineText = textarea.value.substring(currentLineStart, end); // Assuming selection is on a single line for simplicity

    let newText;
    let newCursorPos;

    // If the line already starts with the prefix, remove it (toggle)
    if (textarea.value.substring(currentLineStart, currentLineStart + prefix.length) === prefix) {
        newText = textarea.value.substring(0, currentLineStart) + textarea.value.substring(currentLineStart + prefix.length);
        newCursorPos = start - prefix.length;
    } else {
        newText = `${textarea.value.substring(0, currentLineStart)}${prefix}${textarea.value.substring(currentLineStart)}`;
        newCursorPos = start + prefix.length;
    }

    onApplyFormat(newText, newCursorPos);
     requestAnimationFrame(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
     });
  };

  const applyLinkFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const urlPlaceholder = 'https://example.com';

    let linkText = selectedText || 'link text';
    let newText = `[${linkText}](${urlPlaceholder})`;
    let newCursorPos = start + 1; // Position cursor to edit link text

    if (selectedText) { // If text was selected, cursor after the URL placeholder
        newCursorPos = start + `[${linkText}](${urlPlaceholder})`.length - 1;
    }


    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const finalContent = `${before}${newText}${after}`;

    onApplyFormat(finalContent, newCursorPos);

    requestAnimationFrame(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + `[${linkText}]`.length + 1, start + `[${linkText}]`.length + 1 + urlPlaceholder.length);
      } else {
        textarea.setSelectionRange(start + 1, start + 1 + linkText.length);
      }
    });
  };

  const toolbarButtons = [
    { label: 'Bold', icon: Bold, action: () => applyFormat('**', '**', 'bold text') },
    { label: 'Italic', icon: Italic, action: () => applyFormat('*', '*', 'italic text') },
    { label: 'Unordered List', icon: List, action: () => applyListFormat('- ') },
    { label: 'Ordered List', icon: ListOrdered, action: () => applyListFormat('1. ') },
    { label: 'Link', icon: LinkIcon, action: applyLinkFormat },
    { label: 'Code Block', icon: Code, action: () => applyFormat('```\n', '\n```', 'code here') },
    { label: 'Blockquote', icon: Quote, action: () => applyListFormat('> ') },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-1 p-1.5 sm:p-2 border rounded-md bg-muted/50 mb-2", className)}>
      {toolbarButtons.map(({ label, icon: Icon, action }) => (
        <Button
          key={label}
          variant="ghost"
          size="sm" // Use sm for slightly larger touch targets on mobile
          onClick={action}
          title={label}
          className="p-1.5 sm:p-2 h-auto text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring" // Responsive padding
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Responsive icon size */}
          <span className="sr-only">{label}</span>
        </Button>
      ))}
    </div>
  );
};
