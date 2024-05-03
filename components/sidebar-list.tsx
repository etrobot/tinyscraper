'use client'
import { SidebarItems } from '@/components/sidebar-items'
import { Chat } from '@/lib/types'
import { IconRefresh } from './ui/icons'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from './ui/textarea'
import { useState } from 'react'
interface SidebarListProps {
  userId?: string
  children?: React.ReactNode
}
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function getUrlsText() {
  const storedAgents = localStorage.getItem('urls');
  if (storedAgents) {
    return storedAgents.replace(/\n/g, "\\n")
  } else { return null }
}
export function SidebarList({ userId }: SidebarListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [urlTxt, setUrlTxt] = useState("");
  const chatKeys: string[] = localStorage.getItem('urls')?.split('\n') || [];
  // const chatKeys: string[] = Object.keys(localStorage).filter(key => key.startsWith('cid_'));
  chatKeys.sort().reverse();
  console.log(chatKeys)

  const chats:Chat[] = chatKeys.map(key => {
    const messages = JSON.parse(localStorage.getItem(key) || '[{"content":[]}]');
    return {
      id: key,
      messages
    };
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        {chats?.length ? (
          <div className="space-y-2 px-2">
            <SidebarItems chats={chats} />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No chat history</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between p-4">
      <Tooltip>
          <TooltipTrigger asChild>
            {/* <Button variant="outline" onClick={() => window.location.reload()}><IconRefresh/></Button> */}
        </TooltipTrigger>
        <TooltipContent>Force Reload Page</TooltipContent>
      </Tooltip>
      <>
    <Button variant="outline" onClick={() => { setEditorOpen(true) }}>Edit</Button>
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Import Urls</DialogTitle>
      </DialogHeader>
      <Textarea className="col-span-4 h-[400px]"
        value={ urlTxt || ''}
        onChange={(e) => { setUrlTxt(e.target.value) }}
      />
      <Button onClick={() => { localStorage.setItem('urls', urlTxt || getUrlsText() || ''); setEditorOpen(false) }}>Save Urls</Button>
    </DialogContent>
  </Dialog>
  </>
      </div>
    </div>
  )
}
