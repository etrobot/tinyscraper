import Textarea from 'react-textarea-autosize'
import { UseChatHelpers } from 'ai/react'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { IconArrowElbow,IconPlus } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

import { FooterText } from '@/components/footer'
import {
  Command,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

export interface PromptProps
  extends Pick<UseChatHelpers, 'input' | 'setInput'> {
  onSubmit: (value: string) => void
  isLoading: boolean,
}
export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading
}: PromptProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const router = useRouter()

  const [showPopup, setshowPopup] = useState(false);
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input?.trim()) {
        return;
      }
      setInput('');
      formRef.current?.requestSubmit()
    } else if (e.key === 'Enter' && e.shiftKey) {
      setInput(input + '\n');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value)
    if (value.split(' ')[0] === '@' || value === '@') {
      setshowPopup(true);
    } else {
      setshowPopup(false);
    }
  };

  return (
    <>
      <Command >
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!input?.trim()) {
              return
            }
            setInput('')
            await onSubmit(input)
          }}
          ref={formRef}
        >

          <div className="relative flex flex-col w-full px-8 overflow-hidden max-h-60 grow bg-background sm:rounded-md sm:border sm:px-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={e => {
                    e.preventDefault()
                    router.replace('/')
                    router.refresh()
                  }}
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' }),
                    'absolute left-0 top-4 size-8 rounded-full bg-background p-0 sm:left-4'
                  )}
                  disabled={isLoading}
                >
                  <IconPlus />
                  <span className="sr-only">New Chat</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>

            <Textarea
              ref={inputRef}
              tabIndex={0}
              onKeyDown={!showPopup ? onKeyDown : undefined}
              rows={1}
              value={input}
              onChange={e => handleInputChange(e)}
              placeholder="Send a message."
              spellCheck={false}
              className="min-h-[64px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
            />

            <div className="absolute right-0 top-4 sm:right-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || input === ''}
                  >
                    <IconArrowElbow />
                    <span className="sr-only">Send message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send message</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </form>
      </Command>
      <div className='text-sm text-muted-foreground'>
        <FooterText />
      </div>
    </>
  )
}
