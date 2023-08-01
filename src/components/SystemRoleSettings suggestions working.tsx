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
}

export default (props: Props) => {
  let systemInputRef: HTMLTextAreaElement;

  const [showSuggestions, setShowSuggestions] = createSignal(false);

  const handleInput = (e) => {
    if (e.target.value.slice(-1) === "/") {
      setShowSuggestions(true);
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
          /* Add additional styling as needed */
        }
        .suggestion-popup div:hover {
          background-color: #ddd; /* Change as needed */
        }
        .close-button {
          position: absolute;
          right: 10px;
          top: 10px;
          cursor: pointer;
          /* Add additional styling as needed */
        }
      `}
    </style>

      <Show when={!props.systemRoleEditing()}>
        <Show when={props.currentSystemRoleSettings()}>
          <div>
            <div class="fi gap-1 op-50 dark:op-60">
              <IconEnv />
              <span>System Role:</span>
            </div>
            <div class="mt-1">
              { props.currentSystemRoleSettings() }
            </div>
          </div>
        </Show>
        <Show when={!props.currentSystemRoleSettings() && props.canEdit()}>
          <span onClick={() => props.setSystemRoleEditing(!props.systemRoleEditing())} class="sys-edit-btn">
            <IconEnv />
            <span>Add System Role</span>
          </span>
        </Show>
      </Show>
      <Show when={props.systemRoleEditing() && props.canEdit()}>
        <div>
 
        <div class="fi gap-1 op-50 dark:op-60">
            <IconEnv />
            <span>System Role:</span>
          </div>
          <p class="my-2 leading-normal text-sm op-50 dark:op-60">Kindly instruct the assistant and set the behavior of the assistant.</p>
          <div>
            <textarea
              ref={systemInputRef!}
              onInput={handleInput}
              placeholder="You are a helpful assistant, answer as concisely as possible...."
              autocomplete="off"
              autofocus
              rows="3"
              gen-textarea
            />
    <Show when={showSuggestions()}>
      <div class="suggestion-popup">
        <div class="close-button" onClick={() => setShowSuggestions(false)}>X</div>
        {Object.keys(suggestions).map((suggestion, index) => (
          <div key={index} onClick={() => handleSuggestionClick(suggestion)}>
            {suggestion}
          </div>
        ))}
      </div>
    </Show>
          </div>
          <button onClick={handleButtonClick} gen-slate-btn>
            Set
          </button>
        </div>
      </Show>
    </div>
  );
};
