import { Button, Input, Spacer, useTheme } from "@geist-ui/core";
import { ArrowLeftCircle } from "@geist-ui/icons";
import {
  BaseSyntheticEvent,
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "~/utils/api";
import moment from "moment";
import { Prisma, User } from "@prisma/client";
import DmCard from "../elements/dmCard";
import MediaViewer from "../modals/mediaViewer";
import ImageBg from "next/image";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;
type searchprops = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  setParent: ({ ...props }: any) => void;
  conv: Conversation;
  myuser: User;
  setReply: ({ ...props }: any) => void;
  setDm: ({ ...props }: any) => void;
  session: Session;
};

export default function SearchDm({
  show,
  setShow,
  setParent,
  conv,
  myuser,
  setReply,
  setDm,
  session,
}: searchprops) {
  const [input, setInput] = useState<string | undefined>();
  const theme = useTheme();
  const today = new Date();
  const [refs, SetRefs] = useState<Array<React.RefObject<HTMLInputElement>>>(
    []
  );
  const [take, setTake] = useState<number>(50);
  const messagesEndRef = useRef<HTMLInputElement>(null);
  const [showMenu, setMenu] = useState<React.JSX.Element | null>(null);
  const [showMediaViewer, setShowMediaViewer] =
    useState<React.JSX.Element | null>();

  const messages = api.chat.getMessages.useQuery({
    convId: conv.id,
    search: input,
    limit: take,
  });

  const { data: membersIds } = api.group.getIds.useQuery({
    convId: conv.id,
  });

  const { data: blocked } = api.chat.getBlocked.useQuery({
    convId: conv.id,
  });

  const scrollToRef = (ref: React.RefObject<HTMLInputElement>) => {
    // const newrefs: Array<React.RefObject<HTMLInputElement>> = [];
    // for (let i = 0; i < refs.length; i++) {
    //   if (refs[i]?.current != null) newrefs.push(refs[i]!);
    // }
    // SetRefs(newrefs);
    // console.log(refs, messages?.length);
    // console.log(ref);
    ref.current?.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "center",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.data?.msgs]);

  const replySet = () => {
    setParent(false);
    setShow(false);
  };

  return (
    <div>
      <div
        className="z-50"
        style={{ backgroundColor: theme.palette.background }}
      >
        {showMediaViewer}
      </div>
      <div className={showMediaViewer ? "hidden" : ""}>
        {myuser?.bgImage ? (
          <ImageBg
            className="z-0"
            style={{
              opacity: `${myuser?.bgOpacity !== null ? myuser?.bgOpacity : 1}`,
            }}
            src={myuser?.bgImage}
            alt="Chat background image."
            layout="fill"
            objectFit="cover"
            objectPosition="center"
          />
        ) : null}
        <div
          id="drawer"
          className={
            Capacitor.getPlatform() === "ios"
              ? "absolute left-0 top-4 z-30 m-4"
              : "absolute left-0 top-0 z-30 m-4"
          }
        >
          <Button
            iconRight={<ArrowLeftCircle />}
            auto
            onClick={() => {
              setShow(false);
            }}
            px={0.6}
            scale={2 / 3}
          />
        </div>
        <div
          id="title"
          className={
            Capacitor.getPlatform() === "ios"
              ? "fixed left-0 top-4 z-40 w-full items-center justify-center text-center text-2xl"
              : "fixed left-0 top-0 z-40 w-full items-center justify-center text-center text-2xl"
          }
          style={{ backgroundColor: theme.palette.background }}
        >
          <div className="mx-16 my-2 flex justify-center">
            <Input
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setInput(e.currentTarget.value);
              }}
              onKeyUp={(e: BaseSyntheticEvent) => {
                setInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
              }}
              width="100%"
              marginTop={1}
              className="justify-center"
              placeholder="Caută mesaj"
            />
          </div>
        </div>
        <div
          id="chat"
          className="no-scrollbar z-30 h-screen  w-full -translate-y-3 overflow-scroll"
        >
          <Spacer h={4} />
          <div>
            <div className="py-5 text-center">
              {messages.isLoading || messages.isFetching ? "Loading..." : null}
            </div>
            <div>
              {messages?.data?.msgs.map((msg, i) => (
                <div key={i}>
                  {messages?.data?.msgs[i - 1] ? (
                    msg.date.getDate() >
                    messages?.data?.msgs[i - 1]!.date.getDate() ? (
                      <div
                        className={
                          theme.type === "dark"
                            ? "ml-auto mr-auto flex w-fit justify-center rounded-lg bg-black text-center text-gray-400"
                            : "ml-auto mr-auto flex w-fit justify-center rounded-lg  bg-white text-center text-gray-600"
                        }
                      >
                        <div className="mx-2">
                          {today.getDate() === msg.date.getDate()
                            ? "Astăzi"
                            : moment(msg.date).format("LL")}
                        </div>
                      </div>
                    ) : null
                  ) : (
                    <div
                      className={
                        theme.type === "dark"
                          ? "ml-auto mr-auto flex w-fit justify-center rounded-lg bg-black text-center text-gray-400"
                          : "ml-auto mr-auto flex w-fit justify-center rounded-lg  bg-white text-center text-gray-600"
                      }
                    >
                      <div className="mx-2">
                        {today.getDate() === msg.date.getDate()
                          ? "Astăzi"
                          : moment(msg.date).format("LL")}
                      </div>
                    </div>
                  )}

                  <div className="m-2" ref={refs[i]}>
                    {myuser && membersIds && blocked ? (
                      msg.hidden.includes(
                        myuser.id
                      ) ? null : msg.from_userId !== "system" ? (
                        <DmCard
                          i={i}
                          scrollToRef={scrollToRef}
                          refs={refs}
                          msgs={messages.data.msgs}
                          setRef={SetRefs}
                          myuser={myuser}
                          setTake={setTake}
                          take={messages.data.msgs.length}
                          setReply={setReply}
                          msg={msg}
                          conv={conv}
                          members={membersIds}
                          setDm={setDm}
                          blocked={blocked.blocked}
                          page={"messages"}
                          setShowMediaViewer={setShowMediaViewer}
                          setMenu={setMenu}
                          replySet={replySet}
                          session={session}
                        />
                      ) : (
                        <div
                          className={
                            theme.type === "dark"
                              ? "ml-auto mr-auto flex w-fit justify-center rounded-lg bg-black text-center text-gray-400"
                              : "ml-auto mr-auto flex w-fit justify-center rounded-lg  bg-white text-center text-gray-600"
                          }
                        >
                          <div className="mx-3 flex items-center justify-center">
                            {msg.message}
                          </div>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: 5 }} ref={messagesEndRef} />
              <Spacer h={3} />
            </div>
          </div>
        </div>
      </div>
      {showMenu}
    </div>
  );
}
