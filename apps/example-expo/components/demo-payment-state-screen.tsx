import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type DemoPaymentState =
  | {
      type: "success";
      status?: string;
      entitlementCount?: number;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "neutral";
      message?: string;
    };

type DemoPaymentStateScreenProps = {
  state: DemoPaymentState;
  onReset: () => void;
};

const STATE_CONTENT: Record<
  DemoPaymentState["type"],
  {
    eyebrow: string;
    title: string;
    accent: string;
    button: string;
  }
> = {
  success: {
    eyebrow: "Payment state",
    title: "Payment success",
    accent: "#22C55E",
    button: "Run demo again",
  },
  error: {
    eyebrow: "Payment state",
    title: "Payment error",
    accent: "#EF4444",
    button: "Try again",
  },
  neutral: {
    eyebrow: "Payment state",
    title: "Neutral",
    accent: "#38BDF8",
    button: "Run demo again",
  },
};

export function DemoPaymentStateScreen({
  state,
  onReset,
}: DemoPaymentStateScreenProps) {
  const content = STATE_CONTENT[state.type];
  const detail =
    state.type === "success"
      ? `status=${state.status ?? "unknown"} · entitlements=${state.entitlementCount ?? 0}`
      : state.type === "error"
        ? state.message
        : state.message ?? "User closed the paywall without a payment result.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: content.accent,
              shadowColor: content.accent,
            },
          ]}
        />
        <Text style={styles.eyebrow}>{content.eyebrow}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.detail}>{detail}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: content.accent, opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>{content.button}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D14",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  eyebrow: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  detail: {
    color: "#CBD5E1",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 320,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    marginTop: 30,
    paddingHorizontal: 28,
    minWidth: 190,
  },
  buttonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "800",
  },
});
