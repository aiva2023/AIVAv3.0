import { createSignal, Show } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import IconEnv from './icons/Env';
import suggestions from './UserRoles.json';

interface Props {
  canEdit: Accessor<boolean>;
  systemRoleEditing: Accessor<boolean>;
  setSystemRoleEditing: Setter<boolean>;
  currentSystemRoleSettings: Accessor<string>;
  setCurrentSystemRoleSettings: Setter<string>;
  setShowMessagesButtons: Setter<boolean>;
  personaInput: Accessor<string>;
}

export default (props: Props) => {
  let systemInputRef: HTMLTextAreaElement;

  const [showSuggestions, setShowSuggestions] = createSignal(false);

  const handleInput = (e) => {
    if (e.target.value.slice(-1) === "/") {
      setShowSuggestions(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    systemInputRef.value = systemInputRef.value.slice(0, -1) + suggestions[suggestion]; // Replace the "/" with the suggestion
    setShowSuggestions(false);
  };

  const handleButtonClick = () => {
    props.setCurrentSystemRoleSettings(systemInputRef.value);
    props.setSystemRoleEditing(false);
    props.setShowMessagesButtons(false);
  };

  const handleSysEditBtnClick = () => {
    props.setSystemRoleEditing(!props.systemRoleEditing());
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div class="my-4">
      <style>
        {`
          .suggestion-popup {
            position: absolute;
            z-index: 1;
            max-height: 200px;
            overflow-y: auto;
            background-color: white;
            border: 1px solid #ccc;
            padding: 10px;
            color: #000;
          }
          .suggestion-popup div {
            transition: transform 0.3s ease;
          }
          .suggestion-popup div:hover {
            transform: scale(1.03);
            background-color: #ddd;
            cursor: pointer;
          }
          @media (prefers-color-scheme: dark) {
            .suggestion-popup {
              background-color: #333;
              color: #fff;
            }
            .suggestion-popup div {
              color: #000;
            }
            .suggestion-popup div:hover {
              background-color: #555;
            }
          }
        `}
      </style>

      <Show when={!props.systemRoleEditing()}>
        <Show when={props.currentSystemRoleSettings()}>
          <div>
            <div class="fi gap-1 op-50 dark:op-60">
              <IconEnv />
              <span>AIVA Persona:</span>
            </div>
            <div class="mt-1">
              { props.currentSystemRoleSettings() }
            </div>
          </div>
        </Show>
        <Show when={!props.currentSystemRoleSettings() && props.canEdit()}>
          <span onClick={handleSysEditBtnClick} class="sys-edit-btn">
            <IconEnv />
            <span>Set AIVA Persona</span>
          </span>
        </Show>
      </Show>
      <Show when={props.systemRoleEditing() && props.canEdit()}>
        <div>
          <div class="fi gap-1 op-50 dark:op-60">
            <IconEnv />
            <span>AIVA Persona:</span>
          </div>
          <p class="my-2 leading-normal text-sm op-50 dark:op-60">Kindly instruct the assistant and set the behavior of the assistant.</p>
          <div>
            <textarea
              ref={systemInputRef!}
              onInput={handleInput}
              placeholder="Type / to browse for prompt templates"
              autocomplete="off"
              autofocus
              rows="3"
              gen-textarea
              value={props.personaInput()}
            />
            <Show when={showSuggestions()}>
              <div class="suggestion-popup">
                {Object.keys(suggestions).map((suggestion, index) => (
                  <div key={index} onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </div>
                ))}
              </div>
            </Show>
          </div>
          <div class="flex items-center gap-2">
            <button onClick={handleButtonClick} gen-slate-btn>
              Set
            </button>
            <button onClick={handleSysEditBtnClick} class="gen-slate-btn cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};
