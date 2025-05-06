// src/components/create-project-dialog.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle } from 'lucide-react';

interface CreateProjectDialogProps {
  onCreateProject: (project: Project) => void;
  children: React.ReactNode; // To wrap the trigger button
}

export function CreateProjectDialog({ onCreateProject, children }: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [titleError, setTitleError] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      setTitleError('Project title cannot be empty.');
      return;
    }
    setTitleError('');

    const newProjectId = uuidv4();
    const newProject: Project = {
      id: newProjectId,
      title: title.trim(),
      projectType: 'mini-project', // Default to 'mini-project'
      projectContext: context.trim(),
      teamDetails: '',
      collegeInfo: '', // Keep collegeInfo if it was intended, or remove if instituteName covers it
      instituteName: '', // Initialize instituteName
      sections: [], // Start with no sections, outline will be generated later
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storageType: 'local', // Default to local storage
      minSections: 5, // Default min sections
      maxSubSectionsPerSection: 2, // Default max sub-section depth
    };
    onCreateProject(newProject);
    setIsOpen(false); // Close dialog on success
    // Reset fields for next time
    setTitle('');
    setContext('');
  };

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          // Reset state if dialog is closed without saving
          setTitle('');
          setContext('');
          setTitleError('');
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Provide a title and some initial context for your project report. The AI will use this to help generate an outline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Title *
            </Label>
            <div className="col-span-3">
                <Input
                  id="name"
                  value={title}
                  onChange={(e) => {
                      setTitle(e.target.value);
                      if (titleError && e.target.value.trim()) {
                          setTitleError(''); // Clear error once user starts typing valid title
                      }
                  }}
                  className={`col-span-3 ${titleError ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                  placeholder="e.g., AI-Powered Report Generator"
                />
                {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="context" className="text-right">
              Context
            </Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="col-span-3 min-h-[100px]"
              placeholder="Briefly describe your project, its goals, scope, and key features or technologies involved."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleCreate}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}