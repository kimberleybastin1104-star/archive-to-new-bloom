import { ClientOnly } from "@tanstack/react-router";
import GymDiary from "./GymDiary";

export function DiaryPage() {
  return (
    <ClientOnly fallback={<div style={{ minHeight: "100vh" }} />}>
      <GymDiary />
    </ClientOnly>
  );
}

export const diaryHead = (title: string) => () => ({
  meta: [
    { title: `${title} · Gym Diary Planner` },
    { name: "description", content: "A gentle gym diary for workouts, habits, goals, food and wellbeing — saved on your device." },
    { property: "og:title", content: `${title} · Gym Diary Planner` },
    { property: "og:description", content: "A gentle gym diary for workouts, habits, goals, food and wellbeing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
