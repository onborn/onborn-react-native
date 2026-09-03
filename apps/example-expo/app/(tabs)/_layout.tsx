import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    // No tab bar: the demo is the flow, full-screen — chrome under it only
    // skews how the rendered journey reads.
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
      <Tabs.Screen name="index" options={{ title: "Flow" }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
