import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  ButtonGroup,
  Card,
  Divider,
  Modal,
  Spacer,
  Text,
  ToastInput,
  useTheme,
  useToasts,
} from "@geist-ui/core";
import moment from "moment";
import {
  CheckInCircle,
  CheckInCircleFill,
  X,
  CornerDownRight,
  Menu,
  Loader,
  File,
  Download,
  ArrowLeftCircle,
} from "@geist-ui/icons";
import { Prisma, User } from "@prisma/client";
import { api } from "~/utils/api";
import ForwardModal from "../modals/forwardModal";
import EditModal from "../modals/editModal";
import React from "react";
import UserInfoModal from "../modals/userInfoModal";
import Image from "next/image";
import MediaViewer from "../modals/mediaViewer";
import DmMenu from "./dmMenu";
import { useLongPress } from "use-long-press";
import { Session } from "next-auth/core/types";
import { FileDownload } from "capacitor-plugin-filedownload";
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

type dmCardProps = {
  myuser: User;
  msg: Message;
  msgs: Array<Message>;
  setReply: ({ ...props }: any) => void;
  i: number;
  setRef: ({ ...props }: any) => void;
  refs: Array<React.RefObject<HTMLInputElement>>;
  scrollToRef: (ref: React.RefObject<HTMLInputElement>) => void;
  members: string[];
  setTake: ({ ...props }: any) => void;
  conv: Conversation;
  take: number;
  setDm: ({ ...props }: any) => void;
  setMenu: ({ ...props }: any) => void;
  blocked: Array<string>;
  page: string;
  setShowMediaViewer: ({ ...props }: any) => void;
  replySet?: () => void;
  session: Session;
};

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", "webm"];
const audioformats = [".mp3", ".aac", ".ogg"];

export default function DmCard({
  myuser,
  msg,
  members,
  setReply,
  i,
  setRef,
  refs,
  scrollToRef,
  msgs,
  take,
  conv,
  setTake,
  setDm,
  blocked,
  page,
  setShowMediaViewer,
  setMenu,
  replySet,
  session,
}: dmCardProps) {
  const [showMore, setMore] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [showForward, setForward] = useState(false);
  const [showEdit, setEdit] = useState(false);
  const [userInfo, setUserInfo] = useState(<></>);
  const [showUserInfo, setShowUserInfo] = useState(true);
  const { setToast } = useToasts();

  // const [msgMedia, setMsgMedia] = useState<Array<string>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const longPress = useLongPress(() =>
    setMenu(
      <DmMenu
        setMenu={setMenu}
        setReply={setReply}
        setEdit={setEdit}
        setForward={setForward}
        setLoading={setLoading}
        loading={loading}
        blocked={blocked}
        msg={msg}
        myuser={myuser}
        isMe={isMe}
        deleteHandler={deleteHandler}
        hideHandler={hideHandler}
        replySet={replySet}
      />
    )
  );

  // const { data: whoRead } = api.chat.isRead.useQuery({ msgId: msg.messageId });

  // const isRead = members.every((element) => {
  //   return whoRead?.read.includes(element);
  // });

  const isRead = members.every((element) => {
    return msg.read.includes(element);
  });

  const mediaOfMsg = msg.media.filter(
    (file) =>
      (imgformats.includes(file.slice(file.length - 4, file.length)) &&
        !videoformats.includes(file.slice(file.length - 4, file.length))) ||
      (!imgformats.includes(file.slice(file.length - 4, file.length)) &&
        videoformats.includes(file.slice(file.length - 4, file.length)))
  );

  const isMe = msg.from_userId == myuser.id;

  const theme = useTheme();

  const delmsg = api.chat.deleteMessage.useMutation();
  const hidemsg = api.chat.hideMessage.useMutation();
  const seen = api.chat.seenMessage.useMutation();
  const utils = api.useContext();

  const newref = useRef<HTMLInputElement>(null);

  const deleteHandler = () => {
    if (msg.from_userId === myuser.id) delmsg.mutate({ msgId: msg.messageId });
  };

  const hideHandler = () => {
    hidemsg.mutate({ msgId: msg.messageId, userId: myuser.id });
  };

  if (mounted === false) {
    if (msg.read.includes(myuser.id) === false) {
      seen.mutate({ msgId: msg.messageId, userId: myuser.id });
    }
    refs.push(newref);
    setRef(refs);

    setMounted(true);
  }

  useEffect(() => {
    if (i != null) {
      refs[i] = newref;
      setRef(refs);
    }

    setMounted(false);
  }, [msg, msgs]);

  useEffect(() => {
    if (mounted && seen.isSuccess && msg.read.includes(myuser.id) === false) {
      // void utils.chat.getMessages.invalidate();
      // void utils.chat.getFirstMessages.invalidate();
      void utils.chat.getLastMessage.invalidate();
    }
  }, [seen.isSuccess]);

  useEffect(() => {
    if (delmsg.isSuccess) setMenu(null);
  }, [delmsg.isSuccess]);

  useEffect(() => {
    if (hidemsg.isSuccess) {
      void utils.chat.getLastMessage.invalidate();
      setTake(msgs.length);
      void utils.chat.getFirstMessages.invalidate();

      setMenu(null);
    }
  }, [hidemsg.isSuccess]);

  return (
    <div
      className={
        isMe
          ? "max-w-screen ml-auto flex place-items-end justify-end"
          : "max-w-screen mr-auto flex place-items-start justify-start"
      }
    >
      <div
        onDoubleClick={() => {
          setReply(msg.messageId);
          if (replySet) replySet();
        }}
        className={
          isMe ? "relative right-0 w-fit" : "relative flex w-fit w-fit flex-row"
        }
      >
        {conv.isGroup ? (
          isMe ? null : (
            <div>
              <Avatar
                className="cursor-pointer"
                onClick={() => {
                  window.history.pushState(null, "", window.location.pathname);
                  setShowUserInfo(true);
                  setUserInfo(
                    <UserInfoModal
                      contact={msg.member.user}
                      show={true}
                      setShow={setShowUserInfo}
                      setDm={setDm}
                      page={page}
                      session={session}
                    />
                  );
                }}
                text={msg.member.name}
                src={msg.member.user.icon}
                w={"30px"}
                h={"30px"}
              />
            </div>
          )
        ) : null}
        <div>
          <div
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            {...longPress()}
            style={
              isMe
                ? {
                    backgroundImage: `linear-gradient(to right, ${myuser
                      .colors[0]!} 0%, ${myuser.colors[1]!} 100%)`,
                    wordWrap: "break-word",
                  }
                : { wordWrap: "break-word" }
            }
            className={
              isMe
                ? "ml-auto box-content flex max-w-md flex-col gap-1 rounded-lg box-decoration-slice px-2 text-right text-white"
                : theme.type === "dark"
                ? "mr-auto box-content flex max-w-md flex-col flex-wrap gap-1 rounded-lg bg-gradient-to-r from-gray-900 to-gray-900 box-decoration-slice px-2 text-white"
                : "mr-auto box-content flex  max-w-md flex-col flex-wrap  gap-1 rounded-lg bg-gradient-to-r from-gray-200 to-gray-200 box-decoration-slice px-2 text-black"
            }
            onClick={() => {
              setMore(true);
            }}
            onMouseEnter={() => {
              setMore(true);
            }}
            onMouseLeave={() => {
              setMore(false);
            }}
          >
            <div
              className={
                isMe ? "grid justify-items-end" : "grid justify-items-start"
              }
            >
              <div
                className={
                  isMe
                    ? "flex gap-2 text-xs text-gray-300"
                    : theme.type === "dark"
                    ? "flex gap-2 text-xs text-gray-300"
                    : "flex gap-2 text-xs text-gray-700"
                }
              >
                {msg.forwarded && !msg.deleted ? (
                  <CornerDownRight size={16} />
                ) : null}
                {msg.forwarded && !msg.deleted ? "redirectionat" : null}

                {msg.edited && msg.forwarded && !msg.deleted ? " & " : null}
                {msg.edited && !msg.deleted ? "editat " : null}
                {msg.edited && !msg.deleted && showMore
                  ? moment(msg.editedDate).format("LT")
                  : null}
              </div>
              {msg.reply ? (
                <div className="py-1">
                  <div
                    onClick={() => {
                      if (findReply(msgs, msg))
                        scrollToRef(refs[findReply(msgs, msg)!]!);
                    }}
                    className={
                      theme.type === "dark"
                        ? "box-content flex flex-col gap-1 rounded-lg bg-black box-decoration-slice px-2 text-white"
                        : "box-content flex flex-col gap-1 rounded-lg bg-white box-decoration-slice px-2 text-black"
                    }
                  >
                    <div
                      style={{
                        color: msg.reply.member.user.colors[2],
                      }}
                      className="text-xs"
                    >
                      {msg.reply?.member.name}
                    </div>
                    <div className="text-sm">
                      {limit(msg.reply?.message, 260)}
                    </div>
                  </div>
                </div>
              ) : null}
              {/* {msg.reply ? (
                <div className="w-full">
                  <Divider />
                </div>
              ) : null} */}
              {conv.isGroup && !isMe ? (
                <div
                  style={{
                    color: msg.member.user.colors[0],
                  }}
                  className="cursor-pointer text-left text-xs"
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      window.location.pathname
                    );
                    setShowUserInfo(true);
                    setUserInfo(
                      <UserInfoModal
                        contact={msg.member.user}
                        show={true}
                        setShow={setShowUserInfo}
                        setDm={setDm}
                        page={page}
                        session={session}
                      />
                    );
                  }}
                >
                  {msg.member.name}
                </div>
              ) : null}
              <div
                className={
                  msg.deleted
                    ? "italic text-gray-300"
                    : "max-w-[22rem] text-ellipsis"
                }
              >
                {renderMentions(
                  msg.message,
                  conv.members,
                  setUserInfo,
                  showUserInfo,
                  setShowUserInfo,
                  setDm,
                  page,
                  session
                )}
              </div>

              <div
                className={
                  isMe
                    ? " text-right text-xs text-gray-300"
                    : theme.type === "dark"
                    ? " text-right text-xs text-gray-300"
                    : " text-right text-xs text-gray-700"
                }
              >
                <div className="flex flex-row">
                  <div className={isMe ? "px-2" : ""}>
                    {showMore
                      ? isRead
                        ? String(moment(msg.date).format("LT") + " citit")
                        : moment(msg.date).format("LLL")
                      : moment(msg.date).format("LT")}
                  </div>
                  {isMe ? (
                    isRead ? (
                      <CheckInCircleFill
                        size={12}
                        className="absolute bottom-0.5 right-0.5"
                      />
                    ) : (
                      <CheckInCircle
                        size={12}
                        className="absolute bottom-0.5 right-0.5"
                      />
                    )
                  ) : null}
                </div>

                {showForward ? (
                  <ForwardModal
                    setMenu={setForward}
                    showMenu={showForward}
                    myUser={myuser}
                    msg={msg}
                    conv={conv}
                    session={session}
                  />
                ) : null}
                {showEdit ? (
                  <EditModal
                    setMenu={setEdit}
                    // take={take}
                    // setTake={setTake}
                    showMenu={showEdit}
                    // myUser={myuser}
                    msg={msg}
                  />
                ) : null}
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-unsafe-call */}
          <div {...longPress()} className="flex flex-col">
            {mediaOfMsg.length > 0 ? (
              mediaOfMsg.length === 1 ? (
                imgformats.includes(
                  mediaOfMsg[0]!.slice(
                    mediaOfMsg[0]!.length - 4,
                    mediaOfMsg[0]!.length
                  )
                ) ? (
                  <Image
                    className={
                      isMe
                        ? "ml-auto max-h-96 max-w-xl cursor-pointer rounded-lg"
                        : "max-h-96 max-w-xl cursor-pointer rounded-lg"
                    }
                    onClick={() => {
                      // setMsgMedia(mediaOfMsg);
                      setShowMediaViewer(
                        <MediaViewer
                          msgMedia={mediaOfMsg}
                          convId={conv.id}
                          setShow={setShowMediaViewer}
                          show={true}
                        />
                      );
                    }}
                    src={mediaOfMsg[0]!}
                    width={250}
                    height={250}
                    style={{ objectFit: "cover" }}
                    layout="fixed"
                    alt="Selected Media."
                    key={i}
                  />
                ) : videoformats.includes(
                    mediaOfMsg[0]!.slice(
                      mediaOfMsg[0]!.length - 4,
                      mediaOfMsg[0]!.length
                    )!
                  ) ? (
                  <video
                    className={isMe ? "ml-auto max-h-96" : "max-h-20"}
                    controls
                    key={i}
                    onClick={() => {
                      // setMsgMedia(mediaOfMsg);
                      setShowMediaViewer(
                        <MediaViewer
                          msgMedia={mediaOfMsg}
                          convId={conv.id}
                          setShow={setShowMediaViewer}
                          show={true}
                        />
                      );
                    }}
                  >
                    <source src={mediaOfMsg[0]} type="video/mp4" />
                    <p>
                      Your browser does not support HTML video. Here is a
                      <a href={mediaOfMsg[0]}>link to the video</a> instead.
                    </p>
                  </video>
                ) : null
              ) : mediaOfMsg.length === 2 ? (
                <div className="flex h-32 w-64 flex-wrap rounded-lg">
                  {mediaOfMsg.map((img, i) =>
                    imgformats.includes(
                      mediaOfMsg[i]!.slice(
                        mediaOfMsg[i]!.length - 4,
                        mediaOfMsg[i]!.length
                      )
                    ) ? (
                      <Image
                        className={
                          isMe
                            ? "ml-auto h-32 w-32 cursor-pointer"
                            : "h-32 w-32 cursor-pointer"
                        }
                        onClick={() => {
                          // setMsgMedia(mediaOfMsg);
                          window.history.pushState(
                            null,
                            "",
                            window.location.pathname
                          );
                          setShowMediaViewer(
                            <MediaViewer
                              msgMedia={mediaOfMsg}
                              convId={conv.id}
                              setShow={setShowMediaViewer}
                              show={true}
                            />
                          );
                        }}
                        src={img}
                        width={100}
                        height={100}
                        layout="fixed"
                        alt="Selected Media."
                        key={i}
                      />
                    ) : videoformats.includes(
                        mediaOfMsg[i]!.slice(
                          mediaOfMsg[i]!.length - 4,
                          mediaOfMsg[i]!.length
                        )
                      ) ? (
                      <video
                        className={
                          isMe
                            ? "ml-auto h-32 w-32 cursor-pointer"
                            : "h-32 w-32 cursor-pointer"
                        }
                        key={i}
                        onClick={() => {
                          // setMsgMedia(mediaOfMsg);
                          window.history.pushState(
                            null,
                            "",
                            window.location.pathname
                          );
                          setShowMediaViewer(
                            <MediaViewer
                              msgMedia={mediaOfMsg}
                              convId={conv.id}
                              setShow={setShowMediaViewer}
                              show={true}
                            />
                          );
                        }}
                      >
                        <source src={mediaOfMsg[0]} type="video/mp4" />
                        <p>
                          Your browser does not support HTML video. Here is a
                          <a href={mediaOfMsg[0]}>link to the video</a> instead.
                        </p>
                      </video>
                    ) : null
                  )}
                </div>
              ) : (
                <div
                  className={
                    isMe
                      ? "ml-auto flex h-48 w-48 flex-wrap rounded-lg"
                      : "flex h-48 w-48 flex-wrap rounded-lg"
                  }
                >
                  {mediaOfMsg.map((img, i) =>
                    i < 4 ? (
                      imgformats.includes(
                        mediaOfMsg[i]!.slice(
                          mediaOfMsg[i]!.length - 4,
                          mediaOfMsg[i]!.length
                        )
                      ) ? (
                        <Image
                          className="h-24 w-24 cursor-pointer"
                          onClick={() => {
                            // setMsgMedia(mediaOfMsg);
                            window.history.pushState(
                              null,
                              "",
                              window.location.pathname
                            );
                            setShowMediaViewer(
                              <MediaViewer
                                msgMedia={mediaOfMsg}
                                convId={conv.id}
                                setShow={setShowMediaViewer}
                                show={true}
                              />
                            );
                          }}
                          src={img}
                          width={100}
                          height={100}
                          layout="fixed"
                          alt="Selected Media."
                          key={i}
                        />
                      ) : videoformats.includes(
                          mediaOfMsg[i]!.slice(
                            mediaOfMsg[i]!.length - 4,
                            mediaOfMsg[i]!.length
                          )
                        ) ? (
                        <video
                          className="h-32 w-32 cursor-pointer"
                          key={i}
                          onClick={() => {
                            // setMsgMedia(mediaOfMsg);
                            window.history.pushState(
                              null,
                              "",
                              window.location.pathname
                            );
                            setShowMediaViewer(
                              <MediaViewer
                                msgMedia={mediaOfMsg}
                                convId={conv.id}
                                setShow={setShowMediaViewer}
                                show={true}
                              />
                            );
                          }}
                        >
                          <source src={mediaOfMsg[0]} type="video/mp4" />
                          <p>
                            Your browser does not support HTML video. Here is a
                            <a href={mediaOfMsg[0]}>link to the video</a>{" "}
                            instead.
                          </p>
                        </video>
                      ) : null
                    ) : null
                  )}
                </div>
              )
            ) : null}
            {/* FILES */}
            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-call */}
            <div {...longPress()} className="flex flex-col justify-end">
              {msg.media.length > 0
                ? msg.media.map((file, i) =>
                    !imgformats.includes(
                      file.slice(file.length - 4, file.length)
                    ) &&
                    !videoformats.includes(
                      file.slice(file.length - 4, file.length)
                    ) ? (
                      audioformats.includes(
                        file.slice(file.length - 4, file.length)
                      ) ? (
                        <div className="items center flex flex-row gap-2">
                          {isMe ? (
                            <div className="py-4">
                              <Button
                                iconRight={<Download />}
                                auto
                                onClick={() => {
                                  if (Capacitor.getPlatform() === "web") {
                                    void downloadFile(
                                      file,
                                      file.substring(file.lastIndexOf("/") + 1),
                                      setToast
                                    );
                                  } else
                                    void download(
                                      file,
                                      file.substring(file.lastIndexOf("/") + 1),
                                      setToast
                                    );
                                }}
                                px={0.6}
                                scale={2 / 3}
                              />
                            </div>
                          ) : null}
                          <audio
                            className={
                              theme.type === "dark"
                                ? isMe
                                  ? "my-1 ml-auto h-14 invert"
                                  : "my-1 h-14 invert"
                                : isMe
                                ? "my-1 ml-auto h-14"
                                : "my-1 h-14"
                            }
                            key={i}
                            controls
                            src={file}
                          >
                            <a href={file}> Download audio </a>
                          </audio>
                          {!isMe ? (
                            <div className="py-4">
                              <Button
                                iconRight={<Download />}
                                auto
                                onClick={() => {
                                  if (Capacitor.getPlatform() === "web") {
                                    void downloadFile(
                                      file,
                                      file.substring(file.lastIndexOf("/") + 1),
                                      setToast
                                    );
                                  } else
                                    void download(
                                      file,
                                      file.substring(file.lastIndexOf("/") + 1),
                                      setToast
                                    );
                                }}
                                px={0.6}
                                scale={2 / 3}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div
                          key={i}
                          className={
                            isMe
                              ? theme.type === "dark"
                                ? "my-1 ml-auto flex w-60 flex-row items-center rounded-lg bg-gray-900"
                                : "my-1 ml-auto flex w-60 flex-row items-center rounded-lg bg-gray-200"
                              : theme.type === "dark"
                              ? "my-1 flex w-40 flex-row items-center rounded-lg bg-gray-900"
                              : "my-1 flex w-40 flex-row items-center rounded-lg bg-gray-200"
                          }
                        >
                          <File className="ml-2" size={35} />
                          <div className="my-4 ml-1 truncate text-xs">
                            {file.substring(file.lastIndexOf("/") + 1)}
                          </div>
                          <Download
                            className={
                              theme.type === "dark"
                                ? "relative right-0 mx-2 ml-auto h-7 w-10 rounded-2xl bg-gray-800 hover:bg-gray-700"
                                : "relative right-0 mx-2 ml-auto h-7 w-10 rounded-2xl bg-gray-300 hover:bg-gray-400"
                            }
                            size={25}
                            onClick={() => {
                              if (Capacitor.getPlatform() === "web") {
                                void downloadFile(
                                  file,
                                  file.substring(file.lastIndexOf("/") + 1),
                                  setToast
                                );
                              } else
                                void download(
                                  file,
                                  file.substring(file.lastIndexOf("/") + 1),
                                  setToast
                                );
                            }}
                          />
                        </div>
                      )
                    ) : null
                  )
                : null}
            </div>
          </div>
        </div>
      </div>
      {showUserInfo ? userInfo : null}
    </div>
  );
}

function limit(string: string, limit: number) {
  if (string)
    if (string.length >= limit) {
      return string.substring(0, limit) + "....";
    } else {
      return string.substring(0, limit);
    }
}

function findReply(msgs: Array<Message>, reply: Message) {
  for (let i = 0; i < msgs.length; i++) {
    if (reply.reply?.messageId === msgs[i]?.messageId) {
      return i;
    }
  }
}

const renderMentions = (
  input: string,
  members: Array<Group_member>,
  setUserInfo: React.Dispatch<React.SetStateAction<React.JSX.Element>>,
  showUserInfo: boolean,
  setShowUserInfo: React.Dispatch<React.SetStateAction<boolean>>,
  setDm: ({ ...props }: any) => void,
  page: string,
  session: Session
) => {
  const regex = /@\w+/g;
  const mentions = input.match(regex) || []; // Extract mentions using regex
  let index = 0;
  const tagged: Array<Group_member> = [];
  // let memberName: string;
  for (let i = 0; i < mentions.length; i++) {
    for (let j = 0; j < members.length; j++) {
      if (members[j])
        if (mentions[i]?.includes(members[j]!.user.tag!)) {
          // memberName = members[j]?.name!;
          tagged.push(members[j]!);
        }
    }
  }
  return input.split(regex).map((text, i) => {
    if (i === mentions.length) return urlify(text);

    const mention = tagged[i];
    index += text.length;

    return (
      <React.Fragment key={index}>
        {urlify(text)}
        {mention ? (
          <a
            className="mention-link"
            onClick={() => {
              if (mention) setShowUserInfo(true);
              setUserInfo(
                <UserInfoModal
                  contact={mention.user}
                  show={true}
                  setShow={setShowUserInfo}
                  setDm={setDm}
                  page={page}
                  session={session}
                />
              );
            }}
          >
            {"@" + mention.name}
          </a>
        ) : (
          mentions[i]
        )}
      </React.Fragment>
    );
  });
};

const urlify = (input: string) => {
  const regex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
  const mentions = input.match(regex) || []; // Extract mentions using regex
  let index = 0;

  return input.split(regex).map((text, i) => {
    if (i === mentions.length) return text;

    const mention = mentions[i];
    index += text.length;

    return (
      <React.Fragment key={index}>
        {text}
        {mention ? (
          <a href={mention} target="_blank">
            {mention}
          </a>
        ) : (
          mentions[i]
        )}
      </React.Fragment>
    );
  });
};

async function downloadFile(
  url: string,
  filename: string,
  setToast: (toast: ToastInput) => void
) {
  try {
    // Fetch the file
    const response = await fetch(url);
    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(
        `Unable to download file. HTTP status: ${response.status}`
      );
    }

    // Get the Blob data
    const blob = await response.blob();

    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(downloadLink.href);
      document.body.removeChild(downloadLink);
    }, 100);
  } catch (error) {
    console.error("Error downloading the file:", error);
    setToast({
      text: "Descărcare eșuată.",
      type: "error",
    });
  }
}

const download = async (
  url: string,
  filename: string,
  setToast: (toast: ToastInput) => void
) => {
  await FileDownload.download({
    url: url,
    fileName: filename,
    // headers for http request with POST method

    // only works on Android, deprecated since 1.0.6
    downloadTitle: "downloading",
    // only works on Android, deprecated since 1.0.6
    downloadDescription: "file is downloading",
  })
    .then((res) => {
      console.log(res.path);
      setToast({
        text: "Descărcare reușită.",
        type: "success",
      });
    })
    .catch((err) => {
      console.log(err);
      setToast({
        text: "Descărcare eșuată.",
        type: "error",
      });
    });
};
