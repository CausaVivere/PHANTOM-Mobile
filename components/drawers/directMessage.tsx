import {
  Card,
  Drawer,
  Text,
  Input,
  Button,
  Divider,
  Modal,
  useTheme,
  Spacer,
  Avatar,
  Progress,
  useToasts,
} from "@geist-ui/core";
import React, {
  BaseSyntheticEvent,
  ChangeEvent,
  LegacyRef,
  useEffect,
  useRef,
  useState,
} from "react";
import AvatarWithStatus from "../avatar";
import {
  ChevronRightCircleFill,
  ArrowLeftCircle,
  Emoji,
  X,
  MoreHorizontal,
  CheckInCircle,
  CheckInCircleFill,
  Image,
  File,
} from "@geist-ui/icons";
import emoji from "../types/emojiType";
import DmCard from "../elements/dmCard";
import moment from "moment";
import "moment/locale/ro";
import { Prisma, User } from "@prisma/client";
import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { api } from "~/utils/api";
import ConvInfoDrawer from "./convInfo";
import ImageBg from "next/image";
import { useS3Upload } from "next-s3-upload";
import MediaViewer from "../modals/mediaViewer";
import { App as CapacitorApp } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { useSession } from "next-auth/react";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";

type Message = Prisma.MessageGetPayload<{
  include: {
    member: {
      include: { user: true };
    };
    reply: {
      include: { member: { include: { user: { select: { colors: true } } } } };
    };
  };
}>;

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

type Group_member = Prisma.Group_memberGetPayload<{
  include: { user: true };
}>;

type directMessageProps = {
  status: boolean;
  conv: Conversation;
  setDm: ({ ...props }: any) => void;
  page: string;
  session: Session;
};

let cursorPositionStart: number | undefined;
let activeConvId: string | undefined = undefined;

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", ".ogg", "webm"];

export default function DirectMessage({
  status,
  setDm,
  conv,
  page,
  session,
}: directMessageProps) {
  const [emojiPicker, setPicker] = useState(false);
  const [showInfo, setInfo] = useState(false);
  const [theInput, setInput] = useState("");
  const [media, setMedia] = useState<Array<string>>([]);
  const [showMenu, setMenu] = useState<React.JSX.Element | null>(null);
  const [showMediaViewer, setShowMediaViewer] =
    useState<React.JSX.Element | null>();

  // const [fetched, setFetched] = useState(false);
  const [replyId, setReply] = useState<string>();
  const theme = useTheme();
  const [data, setData] = useState<
    Group_member | Conversation | undefined | null
  >();
  const [refs, SetRefs] = useState<Array<React.RefObject<HTMLInputElement>>>(
    []
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const inputElement = useRef<HTMLInputElement>(null);
  const [pendingMsgs, setPending] = useState<Array<Message>>([]);
  const [index, setIndex] = useState(0);
  const [isTagging, setTag] = useState<boolean>(false);
  const [tagged, setTagged] = useState<string>("");
  const [selectedTag, setSelected] = useState<number>(0);
  const [taggable, setTaggable] = useState<boolean>(true);
  const [members, setMembers] = useState<Array<Group_member>>([]);

  const scrollHeight = useRef<number | null>(null);

  const [take, setTake] = useState<number>(20);

  const { data: someconv } = api.chat.getSomeConv.useQuery({ convId: conv.id });

  const utils = api.useContext();
  const { uploadToS3, files, resetFiles } = useS3Upload();

  const { setToast } = useToasts();

  const { data: myuser } = api.user.get.useQuery({ userId: session.user.id });
  const { data: member } = api.group.getMember.useQuery({
    userId: session.user.id,
    convId: conv.id,
  });
  const msgs = api.chat.getMessages.useInfiniteQuery(
    {
      convId: conv?.id,
      limit: 20,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const { data: firstMsgs, isSuccess } = api.chat.getFirstMessages.useQuery({
    convId: conv?.id,
    limit: take,
  });

  const { data: blocked } = api.chat.getBlocked.useQuery({
    convId: conv.id,
  });

  const today = new Date();
  const [messages, setMessages] = useState<Array<Message>>();

  const { data: membersIds } = api.group.getIds.useQuery({
    convId: conv?.id,
  });

  const { data: otherUser, isFetched } = api.user.getOtherUser.useQuery({
    convId: conv?.id,
    userId: myuser?.id as string,
  });

  const statusUpdate = api.user.updateStatus.useMutation();

  const sendMsg = api.chat.sendMessage.useMutation();

  const replyMsg = api.chat.getMessage.useMutation();

  const isTyping = api.chat.isTyping.useMutation();

  const audioRef = useRef<HTMLAudioElement>(null);

  const newMsgPlay = () => {
    const muteSounds =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("muteSounds") === "false" ||
          localStorage.getItem("muteSounds") === "true"
          ? localStorage.getItem("muteSounds")
          : "false"
        : "false";
    if (audioRef?.current && muteSounds === "false") {
      void audioRef.current.play();
    }
  };

  let userName: string;
  for (let i = 0; i < conv.members.length; i++) {
    if (conv.members[i]?.userId === myuser?.id)
      userName = conv.members[i]!.name;
  }

  api.chat.convUpdates.useSubscription(
    { userId: session.user.id },
    {
      onData(theconv) {
        void utils.chat.getSomeConv.invalidate();
        void utils.group.getMember.invalidate();
        void utils.chat.getBlocked.invalidate();
        void utils.user.get.invalidate();
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.chat.nicknameUpdates.useSubscription(
    { userId: session.user.id },
    {
      onData(theconv) {
        void utils.chat.getSomeConv.invalidate();
        void utils.group.getMember.invalidate();
        void utils.user.getOtherUser.invalidate();

        if (messages) setTake(messages.length);
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
        if (msg.convId === conv.id) {
          // messages?.push(msg);
          if (messages) setMessages([...messages, msg]);
          else setMessages([msg]);
          newMsgPlay();
          void utils.chat.getMessages.reset();
          void utils.chat.getMedia.invalidate();
          void utils.chat.getLastInteracted.invalidate();
          pendingMsgs.shift();
          setPending(pendingMsgs);

          if (chatdiv)
            if (chatdiv?.scrollTop > (chatdiv?.scrollHeight / 2) * 0.8)
              scrollToBottom();
          if (replyId != undefined && replyId != "" && replyId != null) {
            setReply(undefined);
            replyMsg.reset();
          }
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.chat.msgUpdates.useSubscription(
    { convId: conv.id },
    {
      onData(msg) {
        chatdiv
          ? (scrollHeight.current = chatdiv.scrollHeight - chatdiv.scrollTop)
          : null;

        if (messages) {
          const newmsgs = messages;
          for (let i = 0; i < messages.length; i++) {
            if (messages[i]?.messageId === msg.messageId) {
              newmsgs[i] = msg;
            }
          }

          setMessages([...newmsgs]);
          void utils.chat.getLastMessage.invalidate();
          void utils.group.getIds.invalidate();
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  const [currentlyTyping, setCurrentlyTyping] = useState<string[]>([]);
  api.chat.whoIsTyping.useSubscription(
    { convId: conv.id },
    {
      onData(data) {
        setCurrentlyTyping(data);
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  // useEffect(() => {
  //   if (chatdiv)
  //     if (chatdiv?.scrollTop > (chatdiv?.scrollHeight / 2) * 0.8)
  //     scrollToBottom();
  // }, [theInput]);

  useEffect(() => {
    scrollToBottom();
  }, [media, replyMsg.data]);

  let chatdiv = document.getElementById("chat");

  const handleScroll = () => {
    const scrollPosition = chatdiv?.scrollTop; // => scroll position

    if (chatdiv?.scrollTop === 0) {
      chatdiv?.scrollBy(0, 2);
      scrollHeight.current = chatdiv.scrollHeight;

      void msgs.fetchNextPage();
      setIndex(index + 1);
    }
  };

  const handleFilesChange = async ({ target }: BaseSyntheticEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const files: Array<File> = Array.from(target.files as Array<File>);

    for (let index = 0; index < files.length; index++) {
      const file: File = files[index]!;
      if (file.size < 30000000) {
        const { url } = await uploadToS3(file);

        setMedia((current) => [...current, url]);
      } else
        return setToast({
          text: "Unele fisiere nu au fost trimise pentru ca aveau mai mult de 30 MB.",
          type: "warning",
        });
    }
  };

  useEffect(() => {
    chatdiv = document.getElementById("chat");
    if (scrollHeight.current !== null && chatdiv) {
      if (chatdiv?.scrollTop > (chatdiv?.scrollHeight / 2) * 0.8)
        scrollToBottom();
      else {
        chatdiv.scrollTop = chatdiv.scrollHeight - scrollHeight.current;

        scrollHeight.current = null;
      }
    } else {
      scrollToBottom();
    }

    chatdiv?.addEventListener("scroll", handleScroll);
    return () => {
      chatdiv?.removeEventListener("scroll", handleScroll);
    };
  }, [messages]);

  useEffect(() => {
    if (replyId != undefined && replyId != "" && replyId != null)
      replyMsg.mutate({ msgId: replyId });
  }, [replyId]);

  useEffect(() => {
    activeConvId = conv.id;
    if (conv?.isGroup === false) {
      setData(otherUser);
    } else {
      setData(someconv);
    }
  }, [isFetched, someconv]);

  const handleSend = () => {
    if (theInput != "" && theInput.trim().length !== 0) {
      sendMsg.mutate({
        convId: conv?.id,
        userId: myuser?.id as string,
        memberId: member?.id as string,
        msg: theInput,
        replyId: replyId,
        media: media,
      });
      if (member)
        pendingMsgs?.push({
          messageId: "",
          from_userId: myuser?.id as string,
          message: theInput,
          date: new Date(),
          originalSender: myuser?.id as string,
          forwarded: false,
          edited: false,
          editedDate: new Date(),
          deleted: false,
          replyId: null,
          reply: null,
          member: member as Group_member,
          read: [],
          hidden: [],
          media: [],
          memberId: "",
          convId: "",
        });
      setPending(pendingMsgs);
    } else if (media && media.length > 0) {
      sendMsg.mutate({
        convId: conv?.id,
        userId: myuser?.id as string,
        memberId: member?.id as string,
        replyId: replyId,
        msg: "",
        media: media,
      });
      if (member)
        pendingMsgs?.push({
          messageId: "",
          from_userId: myuser?.id as string,
          message: "",
          date: new Date(),
          originalSender: myuser?.id as string,
          forwarded: false,
          edited: false,
          editedDate: new Date(),
          deleted: false,
          replyId: null,
          reply: null,
          member: member as Group_member,
          read: [],
          hidden: [],
          media: media,
          memberId: "",
          convId: "",
        });
      setPending(pendingMsgs);
    }

    setTaggable(true);
    setInput("");
    resetFiles();
    setMedia([]);
  };

  moment.locale("ro");

  const messagesEndRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (chatdiv) chatdiv.scrollTop = chatdiv.scrollHeight;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const addEmoji = (e: emoji) => {
    const emoji = e.native;

    if (
      !cursorPositionStart &&
      inputElement.current &&
      inputElement?.current?.selectionStart != null
    )
      cursorPositionStart = inputElement?.current?.selectionStart;
    const newinput =
      theInput.slice(0, cursorPositionStart) +
      emoji +
      theInput.slice(cursorPositionStart);
    setInput(newinput);
    if (cursorPositionStart) cursorPositionStart += emoji.length;
  };

  useEffect(() => {
    if (firstMsgs) {
      // if (scrollHeight && chatdiv) scrollHeight.current = chatdiv.scrollTop;
      if (messages)
        if (messages?.length > 21)
          chatdiv
            ? (scrollHeight.current = chatdiv.scrollHeight - chatdiv.scrollTop)
            : null;
      setMessages(firstMsgs);
    }
  }, [isSuccess, firstMsgs]);

  useEffect(() => {
    scrollToBottom();
    const regex = /@(?!\w+)/g;
    if (
      (isTagging && taggable && conv.isGroup) ||
      (regex.test(theInput) && taggable && conv.isGroup)
    ) {
      if (!tagged || tagged === "") setMembers(conv.members);
      setTag(true);

      if (cursorPositionStart && theInput.at(cursorPositionStart)) {
        if (
          theInput.at(cursorPositionStart)! === " " ||
          RegExp(/^\p{L}/, "u").test(theInput.at(cursorPositionStart)!) ||
          /^\d$/.test(theInput.at(cursorPositionStart)!)
        ) {
          if (theInput.at(cursorPositionStart)! !== undefined) {
            setTagged(tagged.concat(theInput.at(cursorPositionStart)!));
          }
        }
      }
    } else {
      setTag(false);

      setTagged("");
      setMembers([]);
    }
  }, [theInput]);

  useEffect(() => {
    if (isTagging) {
      const newmembers: Array<Group_member> = [];
      for (let i = 0; i < conv.members.length; i++) {
        if (conv.members[i]?.name.toLowerCase().includes(tagged.toLowerCase()))
          newmembers.push(conv.members[i]!);
      }
      setMembers([...newmembers]);
    }
  }, [tagged]);

  useEffect(() => {
    if (
      index > 0 &&
      msgs.isSuccess &&
      msgs.data.pages[index] &&
      !msgs.isFetchingNextPage
    ) {
      setMessages((prevMessages) =>
        msgs.data.pages[index]?.msgs.concat(prevMessages!)
      );
    }
  }, [msgs.isFetchingNextPage]);

  useEffect(() => {
    statusUpdate.mutate({
      userId: session.user.id,
      status: "online",
    });
    activeConvId = conv.id;
    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        void CapacitorApp.exitApp();
      } else if (showInfo === false) {
        activeConvId = undefined;
        setDm(null);
      }
    });
    void Keyboard.addListener("keyboardDidShow", (info) => {
      console.log("keyboard did show with height:", info.keyboardHeight);
      // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (chatdiv) chatdiv.scrollTop = chatdiv.scrollHeight;
    });
    void Keyboard.addListener("keyboardWillShow", (info) => {
      console.log("keyboard did show with height:", info.keyboardHeight);
      // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (chatdiv) chatdiv.scrollTop = chatdiv.scrollHeight;
    });
    // return () => {};
  }, []);

  return (
    <div className="max-w-screen max-h-screen">
      <div
        className={
          showInfo
            ? "hidden"
            : "w-98 z-50 flex h-screen max-h-screen flex-col overflow-auto"
        }
      >
        <div
          className={
            showMediaViewer || showInfo
              ? "hidden"
              : "w-98 max-w-screen z-50 flex h-screen max-h-screen flex-col overflow-auto"
          }
        >
          <div
            className={
              Capacitor.getPlatform() === "ios"
                ? "absolute right-1 top-4 z-50 m-4"
                : "absolute right-1 top-0 z-50 m-4"
            }
          >
            <Button
              iconRight={<MoreHorizontal />}
              auto
              onClick={() => {
                window.history.pushState(null, "", window.location.pathname);
                setInfo(true);
              }}
              px={0.6}
              scale={2 / 3}
            />
          </div>
          <div
            className={
              Capacitor.getPlatform() === "ios"
                ? "absolute left-1 top-4 z-50 m-4"
                : "absolute left-1 top-0 z-50 m-4"
            }
          >
            <Button
              iconRight={<ArrowLeftCircle />}
              auto
              onClick={() => {
                void utils.chat.getMessages.reset();
                activeConvId = undefined;
                setDm(null);
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
            <div className="m-2 w-full">
              <div className="my-3 flex flex-row items-center justify-center gap-2">
                {data && otherUser ? (
                  <AvatarWithStatus
                    contact={
                      conv.isGroup && someconv ? someconv : otherUser.user
                    }
                    interactive={true}
                    w="40px"
                    h="40px"
                  />
                ) : null}
                <div className={adaptSize(data?.name)}>{data?.name}</div>
                {/* <MoreHorizontal
              className={
                theme.type === "dark"
                  ? " rounded-lg hover:bg-gray-700"
                  : " rounded-lg hover:bg-gray-300"
              }
              onClick={() => {
                setInfo(true);
              }}
            /> */}
              </div>

              {/* <Divider /> */}
            </div>
          </div>

          {myuser?.bgImage ? (
            <ImageBg
              className="z-0"
              style={{
                opacity: `${
                  myuser?.bgOpacity !== null ? myuser?.bgOpacity : 1
                }`,
              }}
              src={myuser?.bgImage}
              alt="Chat background image."
              layout="fill"
              objectFit="cover"
              objectPosition="center"
            />
          ) : null}

          <div
            id="chat"
            className="no-scrollbar z-30 w-full -translate-y-3 overflow-scroll"
          >
            <Spacer h={7} />
            <div>
              <div className="py-5 text-center">
                {msgs.isLoading || msgs.isFetching ? "Loading..." : null}
              </div>
              <div>
                {messages?.map((msg, i) => (
                  <div key={i}>
                    {messages[i - 1] ? (
                      msg.date.getDate() > messages[i - 1]!.date.getDate() ? (
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
                        msg.hidden.includes(myuser.id) ? null : (
                          <div key={i}>
                            {msg.from_userId !== "system" ? (
                              <DmCard
                                i={i}
                                scrollToRef={scrollToRef}
                                refs={refs}
                                msgs={messages}
                                setRef={SetRefs}
                                myuser={myuser}
                                setTake={setTake}
                                take={messages.length}
                                setReply={setReply}
                                msg={msg}
                                conv={conv}
                                members={membersIds}
                                setDm={setDm}
                                blocked={blocked.blocked}
                                page={page}
                                setShowMediaViewer={setShowMediaViewer}
                                setMenu={setMenu}
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
                            )}
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}

                <div>
                  {pendingMsgs.length > 0 ? (
                    <div className="relative bottom-8 my-2 flex w-full flex-col items-end gap-2 py-2 ">
                      {pendingMsgs?.map(
                        (msg: Message, i: React.Key | null | undefined) => (
                          <div
                            className="box-content rounded-lg bg-gradient-to-r from-yellow-900 to-yellow-600 box-decoration-slice px-2"
                            key={i}
                          >
                            <div>
                              <div>{msg.message}</div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {media && media.length > 0 ? (
              <div>
                {/* <div className="relative">
          
              </div> */}

                {/* <Spacer h={3} /> */}
              </div>
            ) : null}

            <div style={{ marginBottom: 5 }} ref={messagesEndRef} />
            <Spacer h={replyMsg.data ? 7 : 4} />
          </div>

          {isTagging ? (
            <div
              className={
                Capacitor.getPlatform() === "ios"
                  ? "absolute bottom-24 z-50 flex w-96 flex-col"
                  : "absolute bottom-20 z-50 flex w-96 flex-col"
              }
            >
              {members.map((member, i) => (
                <div key={i}>
                  {member.userId !== myuser?.id && i < 3 ? (
                    <div
                      key={i}
                      onClick={() => {
                        inputElement.current?.focus();
                        const regex = /@(?!\w+)/g;

                        tagged && members && tagged !== ""
                          ? setInput(
                              theInput.replace(
                                "@" + tagged,
                                "@" + members[i]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                              )
                            )
                          : setInput(
                              theInput.replace(
                                regex,
                                "@" + members[i]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                              )
                            );
                        setTag(false);
                        setTaggable(false);
                        setTagged("");
                        setMembers([]);
                      }}
                      className={
                        selectedTag === i
                          ? "box-content flex flex-row gap-1 rounded-lg bg-gray-600 box-decoration-slice px-2"
                          : "box-content flex flex-row gap-1 rounded-lg bg-gray-900 box-decoration-slice px-2"
                      }
                    >
                      <Avatar
                        className="relative top-3"
                        src={member.user.icon}
                        h="32px"
                        w="32px"
                      />

                      <Text> {member.name}</Text>
                      <Text> ({member.user.tag})</Text>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {blocked ? (
            !(blocked?.blocked.length > 0) ? (
              <div
                style={{ backgroundColor: theme.palette.background }}
                className={
                  Capacitor.getPlatform() === "ios"
                    ? "absolute bottom-4 left-0 z-30 box-content flex w-full flex-col items-center box-decoration-slice"
                    : "absolute bottom-0 left-0 z-30 box-content flex w-full flex-col items-center box-decoration-slice"
                }
              >
                {media.length > 0 || files.length > 0 ? (
                  <div>
                    <div className="flex flex-col">
                      <div className="flex flex-row items-center gap-1 overflow-x-scroll">
                        {media.map((link, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div>
                              {imgformats.includes(
                                link.slice(link.length - 4, link.length)
                              ) ? (
                                <ImageBg
                                  key={i}
                                  className="h-24 w-24"
                                  src={link}
                                  width={100}
                                  height={100}
                                  style={{ objectFit: "cover" }}
                                  layout="fixed"
                                  alt="Selected Media."
                                />
                              ) : videoformats.includes(
                                  link.slice(link.length - 4, link.length)
                                ) ? (
                                <video key={i} className="h-20 w-20">
                                  <source src={link} type="video/mp4" />
                                  <p>
                                    Your browser does not support HTML video.
                                    Here is a
                                    <a href={link}>link to the video</a>{" "}
                                    instead.
                                  </p>
                                </video>
                              ) : (
                                <div className="flex w-10 flex-col rounded-lg bg-gray-500">
                                  <File size={35} />
                                  <div className="m-2 truncate text-xs">
                                    {link.substring(link.lastIndexOf("/") + 1)}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="z-70 my-1">
                              <Button
                                iconRight={<X />}
                                auto
                                onClick={() => {
                                  media.splice(i, 1);
                                  setMedia([...media]);
                                  files.pop();
                                }}
                                px={0.6}
                                scale={2 / 8}
                              />
                            </div>
                          </div>
                        ))}
                        <div className="z-70 m-4">
                          <Button
                            iconRight={<X />}
                            auto
                            onClick={() => {
                              resetFiles();
                              setMedia([]);
                            }}
                            px={0.6}
                            scale={2 / 5}
                          />
                        </div>
                      </div>
                      <div className="flex flex-row">
                        {files.map((file, i) => (
                          <div key={i} className="mx-4 w-16 py-1">
                            <Progress value={file.progress} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {currentlyTyping.filter((user) => user !== member?.name)
                  .length > 0 ? (
                  <div className="relative bottom-0 left-3 mr-auto flex w-fit flex-col ">
                    <div className="truncate text-left text-xs text-gray-300">
                      {currentlyTyping
                        .filter((user) => user !== member?.name)
                        .join(", ") + " "}
                      scrie un mesaj...
                    </div>
                  </div>
                ) : null}

                {replyMsg.data ? (
                  <div className="relative left-3 my-1 mr-auto">
                    <div className="flex max-h-16 flex-row">
                      <div className="z-50">
                        <Button
                          iconRight={<X />}
                          auto
                          onClick={() => {
                            setReply(undefined);
                            replyMsg.reset();
                          }}
                          px={0.6}
                          scale={2 / 5}
                        />
                      </div>
                      <div className="box-content flex flex-col  gap-1 rounded-lg bg-gradient-to-r from-gray-900 to-gray-900 box-decoration-slice px-2 text-white">
                        <div
                          className="text-xs"
                          style={{
                            color: replyMsg.data.member.user.colors[2],
                          }}
                        >
                          {replyMsg.data.member.name}
                        </div>
                        <div className="truncate text-sm">
                          {limit(replyMsg.data.message, 45)}
                        </div>
                      </div>
                    </div>
                    {/* <Spacer h={3} /> */}
                  </div>
                ) : null}

                <div
                  style={{ backgroundColor: theme.palette.background }}
                  className="relative bottom-0 left-0 z-30 box-content flex w-full flex-row items-center box-decoration-slice"
                >
                  <Emoji
                    size={30}
                    className="relative left-2 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation(); // <=== CRITIAL LINE HERE
                      setPicker((emojiPicker) => {
                        return !emojiPicker;
                      });
                    }}
                  />
                  <Image
                    size={30}
                    className="relative left-3 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation(); // <=== CRITIAL LINE HERE

                      fileRef?.current?.click();
                    }}
                  />
                  <Input
                    ref={inputElement}
                    className="z-50 my-3 w-full px-5  "
                    placeholder="Scrie un mesaj"
                    scale={4 / 3}
                    width="100%"
                    value={theInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setInput(e.currentTarget.value);
                    }}
                    onClick={() => {
                      // setTimeout(() => {
                      //   // scrollToBottom();
                      //   if (chatdiv) chatdiv.scrollTop = chatdiv.scrollHeight;
                      // }, 500);
                    }}
                    onKeyDown={() => {
                      if (inputElement.current?.selectionStart)
                        cursorPositionStart =
                          inputElement?.current?.selectionStart;
                      isTyping.mutate({
                        typing: true,
                        userName: userName,
                        convId: conv.id,
                      });
                    }}
                    onKeyUpCapture={(e: BaseSyntheticEvent) => {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      setInput(e.currentTarget.value as string);

                      if (
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        e.currentTarget.value.charAt(
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                          e.currentTarget.value.length - 1
                        ) === " "
                      ) {
                        setTaggable(true);
                      } else if (
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                        e.currentTarget.value.charAt(
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                          e.currentTarget.value.length - 1
                        ) === "@"
                      ) {
                        setTag(true);
                        setTaggable(true);
                      }
                    }}
                    onKeyUp={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter") {
                        if (members.length < 1) {
                          handleSend();
                          setInput("");
                        } else if (members.length > 1) {
                          const regex = /@(?!\w+)/g;

                          tagged && tagged !== ""
                            ? setInput(
                                theInput.replace(
                                  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                                  regex + tagged,
                                  "@" + members[selectedTag]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              )
                            : setInput(
                                theInput.replace(
                                  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                                  regex,
                                  "@" + members[selectedTag]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              );

                          setTag(false);
                          setTaggable(false);
                          setTagged("");
                          setMembers([]);
                        } else if (members.length === 1) {
                          tagged && tagged !== "";
                          const regex = /@(?!\w+)/g;

                          tagged && tagged !== ""
                            ? setInput(
                                theInput.replace(
                                  "@" + tagged,
                                  "@" + members[0]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              )
                            : setInput(
                                theInput.replace(
                                  regex,
                                  "@" + members[0]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              );
                          setTag(false);
                          setTaggable(false);
                          setTagged("");
                          setMembers([]);
                        }
                      } else if (e.key === "Tab") {
                        if (members.length > 1) {
                          const regex = /@(?!\w+)/g;

                          tagged && tagged !== ""
                            ? setInput(
                                theInput.replace(
                                  "@" + tagged,
                                  "@" + members[selectedTag]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              )
                            : setInput(
                                theInput.replace(
                                  regex,
                                  "@" + members[selectedTag]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              );
                          setTag(false);
                          setTaggable(false);
                          setTagged("");
                          setMembers([]);
                        } else if (members.length === 1) {
                          const regex = /@(?!\w+)/g;

                          tagged && tagged !== ""
                            ? setInput(
                                theInput.replace(
                                  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                                  regex + tagged,
                                  "@" + members[0]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              )
                            : setInput(
                                theInput.replace(
                                  regex,
                                  "@" + members[0]!.user.tag // eslint-disable-line @typescript-eslint/restrict-plus-operands
                                )
                              );
                          setTag(false);
                          setTaggable(false);
                          setTagged("");
                          setMembers([]);
                        }
                      } else if (
                        e.key === "Backspace" &&
                        cursorPositionStart &&
                        isTagging
                      ) {
                        const regex = /@(?!\w+)/g;
                        setTagged(tagged.slice(0, tagged.length - 1));
                        if (regex.test(theInput)) {
                          setTag(false);
                          setTaggable(true);
                        }
                      } else if (e.key === "@") {
                        setTag(true);
                        setTaggable(true);
                      } else if (e.key === "ArrowDown") {
                        if (selectedTag + 1 < 3 && isTagging)
                          setSelected(selectedTag + 1);
                      } else if (e.key === "ArrowUp") {
                        if (selectedTag - 1 >= 0 && isTagging)
                          setSelected(selectedTag - 1);
                      } else if (e.key === " ") {
                        setTaggable(true);
                      }
                    }}
                    onBlur={() => {
                      if (inputElement?.current)
                        cursorPositionStart =
                          inputElement.current.selectionStart!;
                      isTyping.mutate({
                        typing: false,
                        userName: userName,
                        convId: conv.id,
                      });
                    }}
                  ></Input>
                  <ChevronRightCircleFill
                    size={50}
                    className="relative right-2 z-50 cursor-pointer"
                    onClick={() => {
                      inputElement.current?.focus();
                      handleSend();
                    }}
                  />
                </div>
                <div className="relative bottom-0 z-50 justify-center">
                  {emojiPicker ? (
                    <Picker
                      data={emojiData}
                      theme={theme.type}
                      className="z-50"
                      onEmojiSelect={(e: emoji) => {
                        if (inputElement.current && cursorPositionStart) {
                          inputElement.current.selectionStart =
                            cursorPositionStart + e.native.length;
                        }

                        addEmoji(e);
                      }}
                      onClickOutside={() => {
                        inputElement.current?.focus();
                        emojiPicker ? setPicker(false) : null;
                        cursorPositionStart = undefined;
                        inputElement?.current?.focus();
                      }}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 z-50 h-12 w-full bg-gray-500 text-center text-lg">
                {member
                  ? blocked.blocked.includes(member.id)
                    ? "Acest utilizator este blocat."
                    : "Ați fost blocat de către acest utilizator. Nu puteți trimite mesaje."
                  : null}
              </div>
            )
          ) : null}

          <input
            style={{ display: "none" }}
            ref={fileRef}
            type="file"
            name="file"
            multiple={true}
            onChange={(e) => void handleFilesChange(e)}
          />
        </div>
        <div
          className="z-50"
          style={{ backgroundColor: theme.palette.background }}
        >
          {showMediaViewer}
        </div>

        {showMenu}
      </div>
      <div>
        {myuser && showInfo ? (
          <ConvInfoDrawer
            show={showInfo}
            setShow={setInfo}
            theconv={conv}
            page={page}
            myuser={myuser}
            setDm={setDm}
            setReply={setReply}
            session={session}
          />
        ) : null}
      </div>

      <audio
        ref={audioRef}
        className="hidden"
        src="https://razvan-hotel-app-bucket.s3.eu-central-1.amazonaws.com/phantom-mobile+essentials/newmsglowervolume.mp3"
      />

      {/* prettier-ignore-end */}
    </div>
  );
}

function adaptSize(text: string | undefined) {
  if (text != null)
    if (text.length >= 26) return "text-sm truncate font-bold";
    else return "text-xl truncate ";
}

function limit(string: string, limit: number) {
  if (string)
    if (string.length >= limit) {
      return string.substring(0, limit) + "....";
    } else {
      return string.substring(0, limit);
    }
}

function filterRefs(someRef: React.RefObject<HTMLInputElement>) {
  return someRef.current === null;
}

export function getActiveConvId() {
  return activeConvId;
}
