'use client'
import { nanoid } from '../lib/utils';
import { useChat, type Message } from 'ai/react'
import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { Button } from '@/components/ui/button'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconRefresh, IconSpinner } from '@/components/ui/icons'
import { PromptForm } from '@/components/prompt-form'
import {useSetting} from '@/lib/hooks/use-setting'
export interface ChatProps extends React.ComponentProps<'div'> {
  id?: string
}

export function Chat({ id, className }: ChatProps) {
  const router = useRouter();
  const timestamp = `${new Date().toISOString().split('.')[0]}`
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/scrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: id,token:keys.current.twitter_auth_token }),
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);
  useEffect(() => {
    setInitialMessages([]);
    if (id) {
      const storedData = localStorage.getItem(id);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setInitialMessages(parsedData);
      }
    } else {
      id = `cid_${timestamp}`;
    }
  }, [id]);
  
  const [keys, setKeys]  = useSetting();

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      api: process.env.NEXT_PUBLIC_API_URL + '/api/chat',
      initialMessages,
      id,
      body: {
        id,
        previewToken:keys.current,
        locale: navigator.language,
      },
      onResponse(response) {
        if (response.status !== 200) {
          toast.error(`${response.status} ${response.statusText}`)
        }
      },
      onFinish(response) {
        const msg = messages ?? initialMessages;
        msg.push({
          id: nanoid(),
          role: 'assistant',
          content: response.content
        })
        localStorage.setItem(id || `cid_${timestamp}`, JSON.stringify(msg));
        router.replace(`/?cid=${id}`);
        router.refresh();
      }
    })

  useEffect(() => {
    stop();
    const token = localStorage.getItem('ai-token')
    if (!token) toast.error('Please set the API keys');
  }, []);
  return (
    <>
      <div className={cn('pb-[200px] md:pt-2', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <>
          </>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% animate-in duration-300 ease-in-out dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
        <ButtonScrollToBottom />
        <div className="mx-auto sm:max-w-3xl sm:px-4">
          <div className="flex items-center justify-center h-12">
            {isLoading ? (
              <Button
                variant="outline"
                onClick={() => stop()}
                className="bg-background"
              >
                <IconSpinner className="mr-2" />
                Generating ... ■
              </Button>
            ) : (
              messages?.length >= 2 && (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => reload()}>
                    <IconRefresh className="mr-2" />
                    Regenerate response
                  </Button>
                </div>
              )
            )}
          </div>
          <div className="px-4 py-2 space-y-2 shadow-lg bg-background sm:rounded-t-xl">
            <PromptForm
              onSubmit={(message) => append({ role: 'user', content: message })}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  )
}