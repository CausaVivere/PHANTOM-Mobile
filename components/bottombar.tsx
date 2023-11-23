import { Button } from "@geist-ui/core";
import { Book, CheckCircle, MessageCircle, Settings } from "@geist-ui/icons";
import { useEffect, useState } from "react";
import TasksDrawer from "./drawers/tasks";
import MessagesDrawer from "./drawers/messages";
import AgendaDrawer from "./drawers/agenda";
import { api } from "~/utils/api";
import { User } from "@prisma/client";

type bottomnav = {
  setPage: ({ ...props }: any) => void;
  pages: string;
};

export default function BottomNav({ setPage, pages }: bottomnav) {
  return (
    <div className="my-1 flex gap-2">
      {buttons.map((button, i) => (
        <Button
          key={i}
          name={button.name}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "fit-content",
          }}
          onClick={() => setPage(button.name)}
          auto
          icon={<button.icon className="h-5 w-5" />}
        />
      ))}
    </div>
  );
}

const buttons = [
  {
    icon: MessageCircle,
    name: "messages",
  },
  { icon: Book, name: "agenda" },
  { icon: CheckCircle, name: "tasks" },
];
