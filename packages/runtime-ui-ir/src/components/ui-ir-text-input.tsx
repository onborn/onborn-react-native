import type { ReactElement } from "react";
import { TextInput, type TextStyle } from "react-native";

import type {
  BuilderV2UiIrNode,
  BuilderV2UiIrStyle,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";

import type { UiIrRendererPorts } from "../ports/ui-ir-renderer";
import { useUiIrScreenState } from "./ui-ir-screen-state";

type TextInputNode = Extract<BuilderV2UiIrNode, { type: "text-input" }>;

/**
 * A field as a view of one screen state: it shows the state and writes it on
 * every keystroke, so a condition on the same screen (`name !== ""` enabling
 * Continue) and the answer the journey reports both see exactly what was
 * typed. The return key carries an ordinary action.
 */
export function UiIrTextInput(props: {
  node: TextInputNode;
  style: BuilderV2UiIrStyle | undefined;
  accessibilityLabel?: string;
  placeholder?: string;
  screenId: string;
  ports: Pick<UiIrRendererPorts, "handleAction">;
}): ReactElement {
  const screenState = useUiIrScreenState();
  const { node } = props;
  const submit = node.submit;
  return (
    <TextInput
      accessibilityLabel={props.accessibilityLabel}
      autoCapitalize={node.autoCapitalize}
      autoCorrect={node.autoCorrect}
      autoFocus={node.autoFocus}
      keyboardType={node.keyboardType}
      maxLength={node.maxLength}
      multiline={node.multiline}
      onChangeText={(text) => screenState.set(node.state, text)}
      onSubmitEditing={
        submit
          ? () => {
              // Selection is the screen's own affair, as it is for a press.
              if (submit.type === "state.set") {
                screenState.set(submit.state, submit.value);
                return;
              }
              void props.ports.handleAction({
                screenId: props.screenId,
                nodeId: node.id,
                action:
                  submit.type === "carousel.advance" ? submit.atEnd : submit,
              });
            }
          : undefined
      }
      placeholder={props.placeholder}
      placeholderTextColor={node.placeholderTextColor}
      returnKeyType={node.returnKeyType}
      secureTextEntry={node.secureTextEntry}
      style={props.style as TextStyle | undefined}
      value={screenState.values[node.state] ?? ""}
    />
  );
}
