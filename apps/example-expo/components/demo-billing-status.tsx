import { StyleSheet, Text, View } from "react-native";

import type { DemoMockBillingState } from "@/hooks/use-demo-mock-billing";

type DemoBillingStatusProps = {
  billing: DemoMockBillingState;
};

export function DemoBillingStatus(props: DemoBillingStatusProps) {
  return (
    <View style={[styles.banner, styles.ok]}>
      <Text style={styles.text}>{props.billing.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  ok: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  text: {
    color: "#f5f5f5",
    fontSize: 12,
  },
});
