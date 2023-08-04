import type { ChatMessage, ErrorMessage } from '@/types'
import { createSignal, Index, Show, onMount, onCleanup } from 'solid-js'
import IconClear from './icons/Clear'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import ErrorMessageItem from './ErrorMessageItem'
import { generateSignature } from '@/utils/auth'
import { useThrottleFn } from 'solidjs-use'
import './Generator.css'
import presetMessages from './presetMessages.json'

export default () => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentError, setCurrentError] = createSignal<ErrorMessage>()
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [controller, setController] = createSignal<AbortController>(null)
  const [firstMessageSent, setFirstMessageSent] = createSignal(false)
  const [selectedCategory, setSelectedCategory] = createSignal(null)
  const [showMessagesButtons, setShowMessagesButtons] = createSignal(true)
  const [addingPersona, setAddingPersona] = createSignal(false)
  const [personaInput, setPersonaInput] = createSignal('') // Added this line

  const handleButtonClick = async () => {
    const inputValue = inputRef.value
    if (!inputValue) {
      return
    }
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
    setFirstMessageSent(true)
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
          if (char === '\\n' && currentAssistantMessage().endsWith('\\n')) {
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
    inputRef.style.height = 'auto'
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentSystemRoleSettings('')
    setShowMessagesButtons(false)
    setAddingPersona(false)
    setPersonaInput('') // Add this line
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
      { !(messageList().length || currentSystemRoleSettings()) && (
        <div>
          <p>Ready to chat? Send your first message or pick a behavior for AIVA from the suggestions below to get started! 🚀</p>
          <div class="button-container">
            {presetMessages.map(({category, messages}) => (
              <div>
                <button 
                  onClick={() => { setSelectedCategory(category); setShowMessagesButtons(true); setAddingPersona(false); }} 
                  className="gen-category-btn"
                  key={`category-${category}`}
                >
                  {category}
                </button>
              </div>
            ))}
          </div>
          {showMessagesButtons() && !addingPersona() && selectedCategory() && 
            <div className="message-buttons-container">
              {Object.entries(presetMessages.find(({category}) => category === selectedCategory()).messages).map(([key, value]) => (
                <button 
                  onClick={() => { 
                    setPersonaInput(value); // Change here
                    setSystemRoleEditing(true); // Open systemRoleEditing
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
                  }} 
                  className="gen-message-btn"
                  key={`presetMessage-${key}`}
                >
                  {key}
                </button>
              ))}
            </div>
          }
          <p>Browse 150+ templates by typing "/", or set your own AIVA Persona here! ⏬ <p>
        </div>
      )}

      <SystemRoleSettings
        canEdit={() => true}
        systemRoleEditing={systemRoleEditing}
        setSystemRoleEditing={(editing) => {
          setAddingPersona(editing);
          setSystemRoleEditing(editing);
        }}
        currentSystemRoleSettings={currentSystemRoleSettings}
        setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
        personaInput={personaInput} // Add this line
        setPersonaInput={setPersonaInput} // Add this line
      />

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
            <span>AIVA is thinking...</span>
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
              inputRef.style.height = 'auto'
              inputRef.style.height = inputRef.scrollHeight + 'px'
            }}
            rows="1"
            className='gen-textarea'
          />
          <button onClick={handleButtonClick} disabled={systemRoleEditing()} className="gen-slate-btn">
            Send
          </button>
          <button title="Clear" onClick={clear} disabled={systemRoleEditing()} className="gen-slate-btn">
            <IconClear />
          </button>
        </div>
      </Show>
    </div>
  )
}
