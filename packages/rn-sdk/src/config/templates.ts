import {
  FlowConfigSchema,
  type FlowConfig,
  type FlowPrimitives,
  type QuizPrimitives,
  type WelcomePrimitives,
} from "@onborn/sdk-contracts";

function defaultWelcomePrimitives(): WelcomePrimitives {
  return {
    title: {
      type: "title",
      slot: "content",
      order: 1,
      visible: true,
      props: { text: "Welcome" },
    },
    subtitle: {
      type: "subtitle",
      slot: "content",
      order: 2,
      visible: true,
      props: { text: "" },
    },
    cta_button: {
      type: "cta_button",
      slot: "content",
      order: 3,
      visible: true,
      props: { text: "Continue", action: "next" },
    },
  };
}

function defaultQuizPrimitives(): QuizPrimitives {
  return {
    back_button: {
      type: "back_button",
      slot: "top",
      order: 0,
      visible: true,
      props: { variant: "icon" },
    },
    badge: {
      type: "badge",
      slot: "content",
      order: 2,
      visible: true,
      props: { text: "Quick quiz" },
    },
    icon: {
      type: "icon",
      slot: "content",
      order: 3,
      visible: true,
      props: { name: "target" },
    },
    image: {
      type: "image",
      slot: "content",
      order: 4,
      visible: true,
      props: {},
    },
    avatar: {
      type: "avatar",
      slot: "content",
      order: 5,
      visible: true,
      props: {},
    },
    title: {
      type: "title",
      slot: "content",
      order: 6,
      visible: true,
      props: { text: "What is your main goal?", size: "lg" },
    },
    subtitle: {
      type: "subtitle",
      slot: "content",
      order: 7,
      visible: true,
      props: { text: "Tell us what you want to improve first." },
    },
    x_stack: {
      type: "x_stack",
      slot: "content",
      order: 8,
      visible: true,
      props: { children: [] },
    },
    y_stack: {
      type: "y_stack",
      slot: "content",
      order: 9,
      visible: true,
      props: { children: [] },
    },
    quiz: {
      type: "quiz",
      slot: "content",
      order: 10,
      visible: true,
      props: {
        mode: "single",
        options: [
          { id: "option_1", label: "Build healthy habits", icon: "target" },
          { id: "option_2", label: "Track my progress", icon: "trophy" },
          { id: "option_3", label: "Stay motivated", icon: "sparkle" },
        ],
        selectedIds: [],
        bg: "#171B22",
        radius: 16,
        padding: 14,
        gap: 10,
        selectionColor: "#5F6FFF",
        iconColor: "#F3F5F8",
        iconSize: 22,
        iconWeight: "duotone",
        color: "#F3F5F8",
        fontSize: 16,
        fontWeight: "600",
        lineHeight: "normal",
      },
    },
    cta_button: {
      type: "cta_button",
      slot: "bottom",
      order: 11,
      visible: true,
      props: { text: "Continue", action: "next" },
    },
  };
}

function defaultFlowPrimitives(): FlowPrimitives {
  return {
    x_stack: {
      type: "x_stack",
      slot: "top",
      order: 0,
      visible: true,
      props: {
        gap: 12,
        alignItems: "center",
        children: [
          {
            type: "back_button",
            visible: true,
            props: { variant: "icon" },
          },
          {
            type: "progress_bar",
            visible: true,
            props: {},
          },
        ],
      },
    },
  };
}

function quizStep(): FlowConfig["steps"][number] {
  return {
    id: "quiz_goal",
    type: "quiz",
    label: "Quiz",
    primitives: defaultQuizPrimitives(),
    layout: {
      preset: "content_focused",
    },
  };
}

function nativeCustomStep(): FlowConfig["steps"][number] {
  return {
    id: "native_profile",
    type: "native_custom",
    label: "Native profile",
    native: {
      rendererKey: "demo-native-profile",
      props: {
        source: "fallback_template",
      },
    },
    primitives: {},
    layout: {
      preset: "content_focused",
    },
  };
}

function welcomeOnlyFlow(fallbackId: string, template: FlowConfig["template"]): Record<string, unknown> {
  return {
    id: fallbackId,
    version: 1,
    template,
    primitives: defaultFlowPrimitives(),
    steps: [
      {
        id: "welcome",
        type: "welcome",
        label: "Welcome",
        primitives: defaultWelcomePrimitives(),
        layout: {
          preset: "content_focused",
        },
      },
      ...(template === "health" ? [quizStep(), nativeCustomStep()] : []),
    ],
  };
}

const RAW_FALLBACK_TEMPLATES: Record<string, unknown> = {
  books: welcomeOnlyFlow("books_fallback", "books"),
  business: welcomeOnlyFlow("business_fallback", "business"),
  health: welcomeOnlyFlow("health_fallback", "health"),
  custom: welcomeOnlyFlow("custom_fallback", "custom"),
};

export type FallbackTemplateName = keyof typeof RAW_FALLBACK_TEMPLATES;

export const FALLBACK_TEMPLATES: Record<FallbackTemplateName, FlowConfig> = {
  books: FlowConfigSchema.parse(RAW_FALLBACK_TEMPLATES.books),
  business: FlowConfigSchema.parse(RAW_FALLBACK_TEMPLATES.business),
  health: FlowConfigSchema.parse(RAW_FALLBACK_TEMPLATES.health),
  custom: FlowConfigSchema.parse(RAW_FALLBACK_TEMPLATES.custom),
};
