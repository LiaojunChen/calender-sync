import type { User, WidgetItem } from "@project-calendar/shared";
import { formatDateCN } from "@project-calendar/shared";

export default function Home() {
  const today = formatDateCN(new Date());

  // Demonstrate that shared types are accessible
  const _exampleUser: Pick<User, "email" | "display_name"> = {
    email: "test@example.com",
    display_name: "Test User",
  };

  const _exampleWidget: WidgetItem = {
    id: "1",
    type: "event",
    title: "Example Event",
    timeText: "09:00 - 10:00",
    color: "#4285f4",
    isCompleted: false,
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Project Calendar - Web</h1>
      <p>Today: {today}</p>
      <p style={{ color: "#666" }}>
        Monorepo setup complete. Shared types imported successfully.
      </p>
    </div>
  );
}
