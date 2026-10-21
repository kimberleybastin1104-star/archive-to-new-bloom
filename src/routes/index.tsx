import { createFileRoute } from "@tanstack/react-router";
import { DiaryPage, diaryHead } from "@/components/DiaryPage";

export const Route = createFileRoute("/")({
  head: diaryHead("Weekly plan"),
  component: DiaryPage,
});
