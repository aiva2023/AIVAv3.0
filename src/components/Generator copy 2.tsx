  import type { ChatMessage, ErrorMessage } from '@/types'
  import { createSignal, Index, Show, onMount, onCleanup } from 'solid-js'
  import IconClear from './icons/Clear'
  import MessageItem from './MessageItem'
  import SystemRoleSettings from './SystemRoleSettings'
  import ErrorMessageItem from './ErrorMessageItem'
  import { generateSignature } from '@/utils/auth'
  import { useThrottleFn } from 'solidjs-use'
  import './Generator.css';

  export default () => {
    let inputRef: HTMLTextAreaElement
    const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
    const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
    const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
    const [currentError, setCurrentError] = createSignal<ErrorMessage>()
    const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [controller, setController] = createSignal<AbortController>(null)
    const [firstMessageSent, setFirstMessageSent] = createSignal(false) // Added state variable for first message
    


    const handleButtonClick = async () => {
      const inputValue = inputRef.value
      if (!inputValue) {
        return
      }
      // @ts-ignore
      if (window?.umami) umami.trackEvent('chat_generate')
      inputRef.value = ''
      setMessageList([
        ...messageList(),
        {
          role: 'user',
          content: inputValue,
        },
      ])
      requestWithLatestMessage()
      setFirstMessageSent(true) // Set firstMessageSent to true after user sends message
    }

    const smoothToBottom = useThrottleFn(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 300, false, true)

    const requestWithLatestMessage = async () => {
      setLoading(true)
      setCurrentAssistantMessage('')
      setCurrentError(null)
      const storagePassword = localStorage.getItem('pass')
      try {
        const controller = new AbortController()
        setController(controller)
        const requestMessageList = [...messageList()]
        if (currentSystemRoleSettings()) {
          requestMessageList.unshift({
            role: 'system',
            content: currentSystemRoleSettings(),
          })
        }
        const timestamp = Date.now()
        const response = await fetch('/api/generate', {
          method: 'POST',
          body: JSON.stringify({
            messages: requestMessageList,
            time: timestamp,
            pass: storagePassword,
            sign: await generateSignature({
              t: timestamp,
              m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
            }),
          }),
          signal: controller.signal,
        })
        if (!response.ok) {
          const error = await response.json()
          console.error(error.error)
          setCurrentError(error.error)
          throw new Error('Request failed')
        }
        const data = response.body
        if (!data) {
          throw new Error('No data')
        }
        const reader = data.getReader()
        const decoder = new TextDecoder('utf-8')
        let done = false

        while (!done) {
          const { value, done: readerDone } = await reader.read()
          if (value) {
            let char = decoder.decode(value)
            if (char === '\n' && currentAssistantMessage().endsWith('\n')) {
              continue
            }
            if (char) {
              setCurrentAssistantMessage(currentAssistantMessage() + char)
            }
            smoothToBottom()
          }
          done = readerDone
        }
      } catch (e) {
        console.error(e)
        setLoading(false)
        setController(null)
        return
      }
      archiveCurrentMessage()
    }

    const archiveCurrentMessage = () => {
      if (currentAssistantMessage()) {
        setMessageList([
          ...messageList(),
          {
            role: 'assistant',
            content: currentAssistantMessage(),
          },
        ])
        setCurrentAssistantMessage('')
        setLoading(false)
        setController(null)
        inputRef.focus()
      }
    }

    const clear = () => {
      inputRef.value = ''
      inputRef.style.height = 'auto';
      setMessageList([])
      setCurrentAssistantMessage('')
      setCurrentSystemRoleSettings('')
    }

    const stopStreamFetch = () => {
      if (controller()) {
        controller().abort()
        archiveCurrentMessage()
      }
    }

    const retryLastFetch = () => {
      if (messageList().length > 0) {
        const lastMessage = messageList()[messageList().length - 1]
        console.log(lastMessage)
        if (lastMessage.role === 'assistant') {
          setMessageList(messageList().slice(0, -1))
        }
        requestWithLatestMessage()
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.isComposing || e.shiftKey) {
        return
      }
      if (e.key === 'Enter') {
        handleButtonClick()
      }
    }

    return (
      <div my-6>

        <SystemRoleSettings
          canEdit={() => messageList().length === 0}
          systemRoleEditing={systemRoleEditing}
          setSystemRoleEditing={setSystemRoleEditing}
          currentSystemRoleSettings={currentSystemRoleSettings}
          setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
        />
        <Show when={!firstMessageSent()}>
          <h1>Welcome! Send your first message to start or choose from the suggestions below:</h1>
          <div class="button-container">
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>🏖️Vacation Planner</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>🖌️AI Draw</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Professor</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Life Coach</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Dietitian</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>ESL Tutor</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Sell Me This Pen</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Self-hel Book</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Grammar Correction</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Plagiarism Checker</button>
            <button class="gen-slate-btn" onClick={() => { inputRef.value = 'Act as a bot'; }}>Financial Planning</button>
          </div>
        </Show>

        <Index each={messageList()}>
          {(message, index) => (
            <MessageItem
              role={message().role}
              message={message().content}
              showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
              onRetry={retryLastFetch}
            />
          )}
        </Index>
        {currentAssistantMessage() && (
          <MessageItem
            role="assistant"
            message={currentAssistantMessage}
          />
        )}
        { currentError() && <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} /> }
        <Show
          when={!loading()}
          fallback={() => (
            <div class="gen-cb-wrapper">
              <span>AI is thinking...</span>
              <div class="gen-cb-stop" onClick={stopStreamFetch}>Stop</div>
            </div>
          )}
        >
          <div class="gen-text-wrapper" class:op-50={systemRoleEditing()}>
            <textarea
              ref={inputRef!}
              disabled={systemRoleEditing()}
              onKeyDown={handleKeydown}
              placeholder="Enter something..."
              autocomplete="off"
              autofocus
              onInput={() => {
                inputRef.style.height = 'auto';
                inputRef.style.height = inputRef.scrollHeight + 'px';
              }}
              rows="1"
              class='gen-textarea'
            />
            <button onClick={handleButtonClick} disabled={systemRoleEditing()} gen-slate-btn>
              Send
            </button>
            <button title="Clear" onClick={clear} disabled={systemRoleEditing()} gen-slate-btn>
              <IconClear />
            </button>
          </div>
        </Show>
      </div>
    )
  }