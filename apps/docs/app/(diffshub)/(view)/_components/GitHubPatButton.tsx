'use client';

import { IconBrandGithub } from '@pierre/icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  clearStoredGitHubPat,
  setStoredGitHubPat,
  useGitHubPat,
  useGitHubViewer,
} from './githubViewer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function GitHubPatButton() {
  const token = useGitHubPat();
  const viewer = useGitHubViewer();
  const [open, setOpen] = useState(false);
  const [draftToken, setDraftToken] = useState('');
  const hasToken = token != null;
  const title =
    token == null
      ? 'Connect GitHub'
      : viewer === undefined
        ? 'Checking GitHub PAT'
        : viewer == null
          ? 'GitHub PAT could not be verified'
          : `Connected as ${viewer.login}`;

  useEffect(() => {
    if (open) {
      setDraftToken('');
    }
  }, [open]);

  function saveToken() {
    const nextToken = draftToken.trim();
    if (nextToken === '') {
      return;
    }
    setStoredGitHubPat(nextToken);
    setDraftToken('');
    setOpen(false);
    toast.success('GitHub PAT saved.');
  }

  function clearToken() {
    clearStoredGitHubPat();
    setDraftToken('');
    setOpen(false);
    toast.success('GitHub PAT cleared.');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-md"
          aria-label={title}
          title={title}
          className={cn(
            'hover:text-muted-foreground hover:bg-transparent',
            hasToken && viewer === null && 'text-destructive',
            hasToken && viewer != null && 'text-foreground'
          )}
        >
          <IconBrandGithub className="size-4 md:size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>GitHub PAT</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveToken();
          }}
        >
          <Input
            type="password"
            value={draftToken}
            autoComplete="off"
            placeholder={hasToken ? 'Paste a new PAT' : 'Paste a PAT'}
            onChange={(event) => setDraftToken(event.currentTarget.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="muted"
              disabled={!hasToken}
              onClick={clearToken}
            >
              Clear
            </Button>
            <Button type="submit" disabled={draftToken.trim() === ''}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
