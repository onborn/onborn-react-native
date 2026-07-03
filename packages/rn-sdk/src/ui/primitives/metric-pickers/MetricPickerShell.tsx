import { Text, YStack } from "tamagui";

type PickerShellProps = {
  label: string;
  caption: string;
};

export function MetricPickerShell({ label, caption }: PickerShellProps) {
  return (
    <YStack
      width="100%"
      minHeight={96}
      borderRadius={18}
      borderWidth={1}
      borderColor="#2B3340"
      backgroundColor="#171B22"
      alignItems="center"
      justifyContent="center"
      gap={6}
      padding={16}
    >
      <Text color="#F3F5F8" fontSize={18} fontWeight="700">
        {label}
      </Text>
      <Text color="#9CA5B3" fontSize={13}>
        {caption}
      </Text>
    </YStack>
  );
}
