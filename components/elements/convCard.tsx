import { Card } from "@geist-ui/core";
import {
  ChevronRight,
  CheckInCircle,
  CheckInCircleFill,
} from "@geist-ui/icons";
import React, { memo, useEffect, useRef, useState } from "react";
import AvatarWithStatus from "../avatar";
import DirectMessage from "../drawers/directMessage";
import { Prisma, User } from "@prisma/client";
import { api } from "~/utils/api";
import moment from "moment";
import { Session } from "next-auth/core/types";

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

type convCardProps = {
  conv: Conversation;
  userId: string;
  status: boolean;
  convers: Array<Conversation>;
  setState: ({ ...props }: any) => void;
  setDm: ({ ...props }: any) => void;
  setConvs: ({ ...props }: any) => void;
  session: Session;
};

type Group_member = Prisma.Group_memberGetPayload<{
  include: { user: true };
}>;

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", ".ogg", "webm"];

export default function ConvCard({
  conv,
  status,
  setState,
  setDm,
  userId,
  setConvs,
  convers,
  session,
}: convCardProps) {
  const [data, setData] = useState<Group_member | Conversation>();

  const { data: msg } = api.chat.getLastMessage.useQuery({
    convId: conv.id,
    userId: userId,
  });

  const { data: lastInteracted } = api.chat.getLastInteracted.useQuery({
    convId: conv.id,
  });

  const { data: someconv } = api.chat.getSomeConv.useQuery({ convId: conv.id });

  const { data: myuser } = api.user.get.useQuery({
    userId: session?.user.id,
  });

  const { data: members } = api.group.getIds.useQuery({
    convId: conv.id,
  });

  const { data: otherUser, isSuccess } = api.user.getOtherUser.useQuery({
    convId: conv?.id,
    userId: session.user.id,
  });

  const utils = api.useContext();

  api.chat.msgUpdates.useSubscription(
    { convId: conv.id },
    {
      onData(msg) {
        void utils.chat.getLastMessage.invalidate();
        void utils.group.getIds.invalidate();
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.chat.onSendMessage.useSubscription(
    { userId: session.user.id },
    {
      onData(msg) {
        // addMessages([post]);
        if (someconv) {
          let isMember = false;
          for (let i = 0; i < someconv.members.length; i++) {
            if (someconv.members[i]?.userId === myuser?.id) isMember = true;
          }

          if (!isMember) {
            const newconvs = convers;
            return setConvs([
              ...newconvs.filter((conv) => !(conv.id === msg.convId)),
            ]);
          }

          const newconvs = convers;
          let auxconv: Conversation;
          for (let i = 0; i < newconvs.length; i++) {
            if (newconvs[i]?.id === msg.convId) {
              auxconv = newconvs[i]!;
              newconvs.splice(i, 1);
              newconvs.unshift(auxconv);
            }
          }
          setConvs([...newconvs]);
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  useEffect(() => {
    if (conv.isGroup === false) {
      if (otherUser) setData(otherUser);
    } else {
      if (someconv) setData(someconv);
      else setData(conv);
    }
  }, [isSuccess, conv, someconv, otherUser]);

  return (
    <Card
      className="cursor-pointer"
      onClick={() => {
        window.history.pushState(null, "", window.location.pathname);
        setDm(
          <DirectMessage
            status={true}
            setDm={setDm}
            conv={conv}
            page={"messages"}
            session={session}
          />
        );
      }}
    >
      <div className="flex flex-row gap-3">
        <div className="grid items-center">
          <AvatarWithStatus
            contact={
              conv.isGroup && someconv
                ? someconv
                : otherUser
                ? otherUser.user
                : conv
            }
            interactive={false}
            w={"50px"}
            h={"50px"}
          />
        </div>
        <div className="items center flex w-full flex-col truncate">
          <div className="font-semibold">{data?.name}</div>
          <div
            className={
              members?.every((element: string) => {
                return msg?.read.includes(element);
              })
                ? statuses.read.color
                : statuses.unread.color
            }
          >
            {msg?.message !== ""
              ? limit(msg?.message, 30)
              : msg.media[0]
              ? imgformats.includes(
                  msg.media[0].slice(
                    msg.media[0].length - 4,
                    msg.media[0].length
                  )
                )
                ? "A trimis o imagine."
                : videoformats.includes(
                    msg.media[0].slice(
                      msg.media[0].length - 4,
                      msg.media[0].length
                    )
                  )
                ? "A trimis un videoclip."
                : "A trimis un fișier."
              : ""}
          </div>
        </div>

        <div className="relative right-0 ml-auto flex-col items-center">
          <div className="absolute right-0 top-4 ml-auto flex flex-col truncate text-xs">
            <div className="top ml-auto flex flex-row items-center">
              {members?.every((element: string) => {
                return msg?.read.includes(element);
              }) ? (
                <statuses.read.icon size={18} />
              ) : (
                <statuses.unread.icon size={18} />
              )}

              <ChevronRight />
            </div>
            <div className="py-2">
              {String(
                moment(lastInteracted?.lastInteracted)
                  .startOf("seconds")
                  .fromNow()
              )}
            </div>
          </div>
          {/* <div className="absolute bottom-0 right-0 ">
          
          </div> */}
        </div>
      </div>
    </Card>
  );
}

function limit(string = "", limit = 0) {
  if (string.length >= limit) {
    return string.substring(0, limit) + "....";
  } else {
    return string.substring(0, limit);
  }
}

const statuses = {
  read: { color: "text-gray-400", icon: CheckInCircleFill },
  unread: { color: "", icon: CheckInCircle },
};
