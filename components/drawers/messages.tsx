import {
  Avatar,
  Card,
  Drawer,
  Text,
  Input,
  Button,
  Modal,
  ButtonGroup,
  Spacer,
} from "@geist-ui/core";
import React, {
  BaseSyntheticEvent,
  ChangeEvent,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { Prisma, User } from "@prisma/client";
import { api } from "~/utils/api";
import ConvCard from "../elements/convCard";
import { ChevronRight, Menu, Plus, X } from "@geist-ui/icons";
import DirectMessage from "./directMessage";
import AvatarWithStatus from "../avatar";
import CreateGroupModal from "../modals/createGroup";
import { set } from "nprogress";
import ChatSettings from "../modals/chatSettings";
import {
  PushNotificationSchema,
  PushNotifications,
  Token,
  ActionPerformed,
} from "@capacitor/push-notifications";
import { UseTRPCMutationResult } from "@trpc/react-query/dist/shared/hooks/types";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";

type MessagesDrawerProps = {
  setState: ({ ...props }: any) => void;
  page: string;
  notifConv: UseTRPCMutationResult<any, any, any, any>;
  session: Session;
  setMuteWeb: ({ ...props }: any) => void;
};

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

export default function MessagesDrawer({
  setState,
  page,
  notifConv,
  session,
  setMuteWeb,
}: MessagesDrawerProps) {
  const [dm, setDm] = useState<React.JSX.Element | null>(null);
  const [input, setInput] = useState<string | undefined>();
  const [query, setQuery] = useState<string | undefined>();
  const [isSearching, setSearching] = useState(false);
  const [showMenu, setMenu] = useState(false);
  const [showCreateGroup, setCreateGroup] = useState(false);
  const [results, setResults] = useState<Array<Conversation | User>>();
  const [index, setIndex] = useState(0);
  const scrollHeight = useRef<number | null>(null);
  const [conversations, setConvs] = useState<Array<Conversation>>([]);

  let msgsdiv: HTMLElement | null;

  const { data: myUser } = api.user.get.useQuery({
    userId: session?.user.id,
  });

  const convs = api.chat.getConvs.useInfiniteQuery(
    {
      userId: session?.user.id,
      limit: 15,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const groups = api.chat.getGroups.useQuery({
    userId: myUser?.id,
    input: query,
  });

  const { data: contacts, isSuccess } = api.agenda.get.useQuery({
    userId: session?.user.id,
    input: query,
  });
  const conv = api.chat.getConv.useMutation();

  const utils = api.useContext();

  api.chat.onAddConv.useSubscription(
    { userId: session.user.id },
    {
      onData(conv) {
        if (conversations) {
          conversations.unshift(conv);
          setConvs([...conversations]);
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.chat.onSendMessage.useSubscription(
    {
      userId: session.user.id,
    },
    {
      onData(msg) {
        void utils.chat.getLastMessage.invalidate();
        void utils.chat.getLastInteracted.invalidate();
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.chat.convUpdates.useSubscription(
    { userId: session.user.id },
    {
      onData(conv) {
        let isMember = false;
        for (let i = 0; i < conv.members.length; i++) {
          if (conv.members[i]?.userId === myUser?.id) isMember = true;
        }

        if (!isMember && convs) {
          const newconvs = conversations;
          for (let i = 0; i < newconvs.length; i++) {
            if (newconvs[i]?.id === conv.id) {
              newconvs.splice(i, 1);
            }
          }

          return setConvs([...newconvs]);
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
    msgsdiv = document.getElementById("msgs");
    handleScroll();
    console.log(msgsdiv);
    msgsdiv?.addEventListener("scroll", handleScroll);
    return () => {
      msgsdiv?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() === "web")
      if (dm) setMuteWeb("true");
      else setMuteWeb("false");
  }, [dm]);

  useEffect(() => {
    if (notifConv.data)
      setDm(
        <DirectMessage
          status={true}
          conv={notifConv.data} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          setDm={setDm}
          page={"messages"}
          session={session}
        />
      );
  }, [notifConv.data]);

  useEffect(() => {
    if (convs.data && convs.isSuccess && !convs.isFetchingNextPage) {
      if (convs.data.pages.length > index && index === 0) {
        console.log(conversations);
        for (let i = 0; i < convs.data.pages.length; i++) {
          conversations.push(...convs.data.pages[i]!.convs);
        }
        setConvs([...conversations]);
      } else {
        convs.data.pages[index]?.convs
          ? conversations || index === 0
            ? setConvs(conversations.concat(convs.data.pages[index]!.convs))
            : setConvs(convs.data.pages[index]!.convs)
          : null;
      }
    }

    msgsdiv = document.getElementById("msgs");
  }, [convs.isFetchingNextPage, convs.isSuccess]);

  useEffect(() => {
    if (groups.data && contacts) {
      const newarray: Array<User | Conversation> = [];
      setResults(newarray.concat(contacts.users).concat(groups.data));
    }
    msgsdiv = document.getElementById("msgs");
  }, [groups.isSuccess, isSuccess]);

  useEffect(() => {
    if (conv.data != undefined)
      setDm(
        <DirectMessage
          status={true}
          conv={conv.data}
          setDm={setDm}
          page={"messages"}
          session={session}
        />
      );
  }, [conv.isSuccess]);

  const sendMsg = (contact: User) => {
    if (session?.user.id !== contact.id)
      conv.mutate({
        userId: session?.user.id,
        contactId: contact.id,
      });
  };

  const handleScroll = () => {
    msgsdiv = document.getElementById("msgs");
    const scrollPosition = msgsdiv?.scrollTop; // => scroll position

    if (msgsdiv)
      if (
        msgsdiv.scrollTop > msgsdiv.scrollHeight - 750 &&
        !convs.isLoading &&
        !convs.isFetchingNextPage
      ) {
        scrollHeight.current = msgsdiv.scrollHeight;
        console.log("scrolled to bottom!!!");
        setIndex(convs.data ? convs.data.pages.length : index + 1);
        void convs.fetchNextPage();
      }
  };

  useEffect(() => {
    const timeOutId = setTimeout(() => setQuery(input), 300);
    if (input === "" || input === undefined) {
      setSearching(false);
    } else {
      setSearching(true);
    }

    return () => clearTimeout(timeOutId);
  }, [input]);
  return (
    <div>
      <div
        className={
          dm ? "hidden" : "w-98 mx-2 flex max-h-screen flex-col overflow-auto"
        }
        onScroll={() => handleScroll()}
        id="msgs"
      >
        <div
          className={
            Capacitor.getPlatform() === "ios"
              ? "absolute left-0 top-4 z-30 m-4"
              : "absolute left-0 top-0 z-30 m-4"
          }
        >
          <Button
            iconRight={<Plus />}
            auto
            px={0.6}
            scale={2 / 3}
            onClick={() => {
              setCreateGroup(true);
            }}
          />
        </div>
        <div
          id="title"
          className="my-5 flex flex-col items-center justify-center text-center text-2xl"
        >
          <div>Mesaje</div>
          <Input
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInput(e.currentTarget.value);
            }}
            onKeyUp={(e: BaseSyntheticEvent) => {
              setInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
            }}
            width="100%"
            marginTop={1}
            placeholder="Caută"
          />
        </div>

        <div id="content" className="my-10 flex flex-col gap-4 py-3">
          <div className="overflox-scroll no-scrollbar flex flex-col gap-4">
            {isSearching
              ? results?.map((contact, i) => (
                  <Card
                    className="cursor-pointer"
                    key={i}
                    onClick={() => {
                      isUser(contact)
                        ? sendMsg(contact)
                        : setDm(
                            <DirectMessage
                              status={true}
                              conv={contact}
                              setDm={setDm}
                              page={"messages"}
                              session={session}
                            />
                          );
                    }}
                  >
                    <div className="flex flex-row gap-2">
                      <div className="grid items-center">
                        <AvatarWithStatus
                          contact={contact}
                          interactive={false}
                          w={"50px"}
                          h={"50px"}
                        />
                      </div>
                      <div className="flex w-[70%] flex-col">
                        <div className="text-lg font-semibold">
                          {contact.name}
                        </div>
                        <div className="truncate text-sm">
                          {isUser(contact)
                            ? contact.departmentName + " / " + contact.role
                            : null}
                        </div>
                      </div>
                      <div className="relative right-0 flex items-center">
                        <ChevronRight />
                      </div>
                    </div>
                  </Card>
                ))
              : conversations?.map((conv, i) => (
                  <div key={i}>
                    <ConvCard
                      conv={conv}
                      userId={myUser?.id as string}
                      status={false}
                      setState={setState}
                      setDm={setDm}
                      convers={conversations}
                      setConvs={setConvs}
                      session={session}
                    />
                  </div>
                ))}
          </div>
        </div>

        {showCreateGroup ? (
          <CreateGroupModal
            showMenu={showCreateGroup}
            setMenu={setCreateGroup}
            setParent={setMenu}
            myUser={myUser!}
            session={session}
          />
        ) : null}

        {/* <Spacer h={6} /> */}
      </div>
      {dm}
    </div>
  );
}

function isUser(obj: User | Conversation): obj is User {
  return "userId" in obj && "email" in obj;
}
