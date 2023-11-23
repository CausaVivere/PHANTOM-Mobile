import { Avatar, Badge, Modal, Image } from "@geist-ui/core";
import { X } from "@geist-ui/icons";
import React, { useState } from "react";
import { User } from "@prisma/client";
import { Conversation } from "@prisma/client";
import { api } from "~/utils/api";

type AvatarWithStatusProps = {
  contact: User | Conversation;
  interactive: boolean;
  w?: string | number;
  h?: string | number;
};

export default function AvatarWithStatus({
  contact,
  interactive = false,
  w = "50px",
  h = "50px",
}: AvatarWithStatusProps) {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<string>("offline");

  const userId = contact && isUser(contact) ? contact.id : "";

  api.user.statuses.useSubscription(
    { userId: userId },
    {
      onData(statuses) {
        for (let i = 0; i < statuses.onlineUsers.length; i++) {
          if (statuses.onlineUsers[i] === userId) {
            return setStatus("online");
          }
          setStatus("offline");
        }

        for (let i = 0; i < statuses.awayUsers.length; i++) {
          if (statuses.awayUsers[i] === userId) {
            return setStatus("away");
          }
          setStatus("offline");
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  return (
    <div>
      <Badge.Anchor>
        {contact ? (
          isUser(contact) ? (
            <Badge
              style={{ backgroundColor: getStatus(status)?.color }}
              dot
              padding="5px"
            />
          ) : null
        ) : null}
        <Avatar
          text={contact?.name}
          src={contact?.icon}
          w={w}
          h={h}
          className={interactive ? "cursor-pointer" : undefined}
          onClick={() => {
            if (interactive === true) setShow(true);
          }}
        />
      </Badge.Anchor>
      <Modal
        visible={show}
        onClose={() => setShow(false)}
        className="max-h-screen max-w-screen-sm"
      >
        <Modal.Content className=" max-w-screen-sm">
          <Image src={contact?.icon} w="100%" h="100%" />
        </Modal.Content>
        <Modal.Action passive onClick={() => setShow(false)}>
          <X />
          Închide
        </Modal.Action>
      </Modal>
    </div>
  );
}

function isUser(obj: User | Conversation): obj is User {
  return "tag" in obj && "email" in obj;
}

function getStatus(status: string) {
  switch (status) {
    case "online":
      return { color: "lime", title: "Online" };
    case "away":
      return { color: "gold", title: "Away" };
    case "offline":
      return { color: "gray", title: "Offline" };
    default:
      break;
  }
}
