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
  Collapse,
  Select,
  ButtonGroup,
  ToastInput,
  useToasts,
} from "@geist-ui/core";
import React, {
  BaseSyntheticEvent,
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import AvatarWithStatus from "../avatar";
import {
  ChevronRightCircleFill,
  ArrowLeftCircle,
  Emoji,
  Tool,
  X,
  Bell,
  BellOff,
  Info,
  LogOut,
  ChevronRight,
  UserPlus,
  ChevronDown,
  Loader,
  XCircle,
  XCircleFill,
  Edit3,
  Hash,
  Image,
  File,
  Download,
  Search,
} from "@geist-ui/icons";
import emoji from "../types/emojiType";
import DmCard from "../elements/dmCard";
import moment from "moment";
import "moment/locale/ro";
import { Prisma, User } from "@prisma/client";
import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { api } from "~/utils/api";
import UserInfoModal from "../modals/userInfoModal";
import AddMembersModal from "../modals/addGroupMembers";
import GroupNameEditModal from "../modals/editGroupName";
import ChangeNicknamesModal from "../modals/changeNicknames";
import GroupIconEditModal from "../modals/changeGroupIcon";
import ImageBg from "next/image";
import MediaViewer from "../modals/mediaViewer";
import { App as CapacitorApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import SearchDm from "./searchDm";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";
import { FileDownload } from "capacitor-plugin-filedownload";

type Message = Prisma.MessageGetPayload<{
  include: {
    member: { include: { user: { select: { icon: true; tag: true } } } };
    reply: { include: { member: true } };
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

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", "webm"];
const audioformats = [".mp3", ".aac", ".ogg"];

type convinfoprops = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  theconv: Conversation;
  page: string;
  myuser: User;
  setDm: ({ ...props }: any) => void;
  setReply: ({ ...props }: any) => void;
  session: Session;
};

type buttonmodal = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  setLoading: ({ ...props }: any) => void;
  member: Group_member;
};

function ButtonsModal({ show, setShow, setLoading, member }: buttonmodal) {
  const removeMember = api.group.removeMember.useMutation();
  const makeAdmin = api.group.makeAdmin.useMutation();
  const removeAdmin = api.group.removeAdmin.useMutation();

  useEffect(() => {
    if (
      removeMember.isSuccess ||
      makeAdmin.isSuccess ||
      removeAdmin.isSuccess
    ) {
      setShow(false);
    }
  }, [removeMember.isSuccess, makeAdmin.isSuccess, removeAdmin.isSuccess]);

  return (
    <Modal visible={show} onClose={() => setShow(false)}>
      <Modal.Content className="grid w-fit place-items-center justify-center">
        <div className="my-5">
          <div
            className={
              Capacitor.getPlatform() === "ios"
                ? "absolute left-0 top-4 z-30 m-4"
                : "absolute left-0 top-0 z-30 m-4"
            }
          >
            <Button
              iconRight={<X />}
              auto
              onClick={() => {
                setShow(false);
              }}
              px={0.6}
              scale={1}
            />
          </div>
        </div>
        {removeMember.isLoading ||
        makeAdmin.isLoading ||
        removeAdmin.isLoading ? (
          <div className="flex flex-col items-center">
            <Loader size={32} /> <Text p>Se încarcă...</Text>
          </div>
        ) : (
          <ButtonGroup scale={1.3} vertical>
            <Button
              scale={1.3}
              onClick={() => {
                removeMember.mutate({
                  convId: member.convId,
                  memberId: member.id,
                });
                setLoading(true);
              }}
            >
              Elimină din grup
            </Button>
            <Button
              scale={1.3}
              onClick={() => {
                member.isAdmin
                  ? removeAdmin.mutate({ memberId: member.id })
                  : makeAdmin.mutate({ memberId: member.id });
                setLoading(true);
              }}
            >
              {member.isAdmin
                ? "Retrogradează de la administrator"
                : "Promovează la administrator"}
            </Button>
          </ButtonGroup>
        )}
      </Modal.Content>
    </Modal>
  );
}

let cursorPositionStart: number | undefined;

export default function ConvInfoDrawer({
  show,
  setShow,
  theconv,
  page,
  myuser,
  setDm,
  setReply,
  session,
}: convinfoprops) {
  const [emojiPicker, setPicker] = useState(false);
  const [theInput, setInput] = useState("");
  const [data, setData] = useState<
    Group_member | Conversation | undefined | null
  >();
  const [showUserInfo, setInfo] = useState(false);
  const [userInfo, setUserInfo] = useState<User | undefined>();
  const [showUserSettings, setShowUserSett] = useState(false);
  const [userSettings, setUserSett] = useState(<></>);
  const [addMembers, setAddMembers] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfirm, setConfirm] = useState(false);
  const [showBlock, setBlock] = useState(false);
  const [showEditName, setEditName] = useState(false);
  const [showChangeIcon, setEditIcon] = useState(false);
  const [showEditNicknames, setEditNicknames] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showSearch, setSearch] = useState(false);
  const [selectMedia, setSelectMedia] = useState<Array<string>>([]);
  const [limit, setLimit] = useState(20);
  const { setToast } = useToasts();

  // const { data: membersIds } = api.group.getIds.useQuery({
  //   convId: conv?.id,
  // });

  const utils = api.useContext();

  const { data: conv } = api.chat.getSomeConv.useQuery({ convId: theconv.id });

  const leave = api.group.leaveGroup.useMutation();

  const block = api.chat.block.useMutation();

  const unblock = api.chat.unblock.useMutation();

  const { data: mymember } = api.group.getMember.useQuery({
    userId: session?.user.id,
    convId: theconv.id,
  });

  const { data: otherUser, isFetched } = api.user.getOtherUser.useQuery({
    convId: theconv.id,
    userId: myuser.id,
  });

  const { data: media } = api.chat.getMedia.useQuery({ convId: theconv.id });

  const mute = api.chat.muteConv.useMutation();

  useEffect(() => {
    // void utils.chat.invalidate();
    if (conv)
      if (conv?.isGroup === false) {
        setData(otherUser);
      } else {
        setData(conv);
      }
  }, [isFetched, conv]);

  useEffect(() => {
    if (leave.isSuccess) {
      setConfirm(false);
      setDm(null);
      setShow(false);
    }
  }, [leave.isSuccess]);

  useEffect(() => {
    if (block.isSuccess || unblock.isSuccess) {
      setBlock(false);
    }
  }, [block.isSuccess, unblock.isSuccess]);

  const theme = useTheme();

  const inputElement = useRef<HTMLInputElement>(null);

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
    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        void CapacitorApp.exitApp();
      } else {
        if (
          showBlock ||
          showChangeIcon ||
          showConfirm ||
          showEditName ||
          showEditNicknames ||
          showMediaViewer ||
          showUserInfo ||
          showUserSettings ||
          addMembers
        ) {
          setAddMembers(false);
          setBlock(false);
          setConfirm(false);
          setEditIcon(false);
          setEditNicknames(false);
          setInfo(false);
          setShowMediaViewer(false);
        } else setShow(false);
      }
    });
    // return () => {};
  }, []);

  return (
    <div>
      <div
        className={showSearch ? "hidden" : ""}
        style={{ backgroundColor: theme.palette.background }}
      >
        <div
          className="z-50"
          style={{ backgroundColor: theme.palette.background }}
        >
          {showMediaViewer ? (
            <MediaViewer
              msgMedia={selectMedia}
              convId={theconv.id}
              setShow={setShowMediaViewer}
              show={showMediaViewer}
            />
          ) : null}
        </div>
        <div className={showMediaViewer ? "hidden" : "z-50"}>
          <div
            id="drawer"
            className={
              Capacitor.getPlatform() === "ios"
                ? "absolute left-0 top-4 z-30 m-6"
                : "absolute left-0 top-0 z-30 m-6"
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
            className="my-5 flex flex-col items-center justify-center text-center text-2xl"
          >
            <div
              className="z-20 w-full"
              style={{ backgroundColor: theme.palette.background }}
            >
              <div className="grid items-center px-2">
                {data ? (
                  <AvatarWithStatus
                    h={"70px"}
                    w={"70px"}
                    contact={
                      theconv.isGroup && conv
                        ? conv
                        : otherUser
                        ? otherUser.user
                        : theconv
                    }
                    interactive={true}
                  />
                ) : null}
                <div className={adaptSize(data?.name)}>{data?.name}</div>
              </div>

              <Divider />
            </div>
          </div>

          <div id="content" className="mx-2 my-10 flex flex-col gap-4 py-3">
            <div className="flex flex-row justify-center gap-4">
              <div
                className={
                  theme.type === "dark"
                    ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                    : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                }
                onClick={() => {
                  setSearch(true);
                }}
              >
                <Search size={32} />
                <div>Caută</div>
              </div>
              {!theconv.isGroup ? (
                <div
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      window.location.pathname
                    );
                    setInfo(true);
                  }}
                  className={
                    theme.type === "dark"
                      ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                      : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                  }
                >
                  <Info size={32} />
                  <div>Informatii</div>
                </div>
              ) : null}
              <div
                className={
                  theme.type === "dark"
                    ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                    : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                }
                onClick={() => {
                  if (mymember && !mute.isLoading)
                    mute.mutate({
                      memberId: mymember?.id,
                      toggle: mymember?.muted ? false : true,
                    });
                }}
              >
                {mymember?.muted ? <BellOff size={32} /> : <Bell size={32} />}
                <div>{mymember?.muted ? "Unmute" : "Mute"}</div>
              </div>

              {!theconv.isGroup ? (
                <div>
                  {mymember ? (
                    conv?.blocked.includes(mymember.id) ? (
                      <div
                        className={
                          theme.type === "dark"
                            ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                            : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                        }
                        onClick={() => {
                          window.history.pushState(
                            null,
                            "",
                            window.location.pathname
                          );
                          setBlock(true);
                        }}
                      >
                        <XCircleFill size={32} />
                        <div>Deblochează</div>
                      </div>
                    ) : (
                      <div
                        className={
                          theme.type === "dark"
                            ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                            : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                        }
                        onClick={() => {
                          window.history.pushState(
                            null,
                            "",
                            window.location.pathname
                          );
                          setBlock(true);
                        }}
                      >
                        <XCircle size={32} />
                        <div>Blochează</div>
                      </div>
                    )
                  ) : null}
                </div>
              ) : (
                <div
                  className={
                    theme.type === "dark"
                      ? "flex cursor-pointer flex-col items-center rounded-lg text-sm hover:bg-gray-700"
                      : "hover:bg-gray-3 00 flex cursor-pointer flex-col items-center  rounded-lg text-sm"
                  }
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      window.location.pathname
                    );
                    setConfirm(true);
                  }}
                >
                  <LogOut size={32} />
                  <div>Părăsește</div>
                </div>
              )}
            </div>
            <div className="py-3">
              <Collapse.Group>
                <Collapse title="Setări conversație">
                  <div className="flex flex-col gap-2">
                    {mymember ? (
                      theconv.isGroup && mymember?.isAdmin ? (
                        <div className="flex flex-col gap-2">
                          <Card
                            className="flex cursor-pointer flex-row"
                            onClick={() => {
                              window.history.pushState(
                                null,
                                "",
                                window.location.pathname
                              );
                              setEditName(true);
                            }}
                          >
                            <div className="mx-2 flex flex-row items-center gap-4">
                              <Edit3 size={25} />
                              <div>Schimbă numele grupului</div>
                            </div>
                          </Card>
                          <Card
                            className="flex cursor-pointer flex-row"
                            onClick={() => {
                              window.history.pushState(
                                null,
                                "",
                                window.location.pathname
                              );
                              setEditIcon(true);
                            }}
                          >
                            <div className="mx-2 flex flex-row items-center gap-4">
                              <Image size={25} />
                              <div>Schimbă poza grupului</div>
                            </div>
                          </Card>
                        </div>
                      ) : null
                    ) : null}
                    <Card
                      className="flex cursor-pointer flex-row"
                      onClick={() => {
                        window.history.pushState(
                          null,
                          "",
                          window.location.pathname
                        );
                        setEditNicknames(true);
                      }}
                    >
                      <div className="mx-2 flex flex-row items-center gap-4">
                        <Hash size={25} />
                        <div>Schimbă porecle</div>
                      </div>
                    </Card>
                  </div>
                </Collapse>
                {theconv.isGroup ? (
                  <Collapse title="Membri conversație">
                    <div className="flex flex-col gap-2">
                      <Card
                        className="flex cursor-pointer flex-row"
                        onClick={() => {
                          window.history.pushState(
                            null,
                            "",
                            window.location.pathname
                          );
                          setAddMembers(true);
                        }}
                      >
                        <div className="mx-2 flex flex-row items-center gap-4">
                          <UserPlus size={30} />
                          <div>Adaugă membrii</div>
                        </div>
                      </Card>

                      {conv?.members?.map(
                        (member, i: React.Key | null | undefined) => (
                          <div key={i}>
                            <Card key={i}>
                              <div className="flex flex-row items-center gap-2">
                                <div
                                  className={
                                    theme.type === "dark"
                                      ? "flex cursor-pointer flex-row items-center gap-2 hover:bg-gray-900"
                                      : "flex cursor-pointer flex-row items-center gap-2 hover:bg-gray-100"
                                  }
                                  onClick={() => {
                                    window.history.pushState(
                                      null,
                                      "",
                                      window.location.pathname
                                    );
                                    setInfo(true);
                                    setUserInfo(member.user);
                                  }}
                                >
                                  <div className="grid items-center">
                                    <AvatarWithStatus
                                      contact={member.user}
                                      interactive={false}
                                      w={"35px"}
                                      h={"35px"}
                                    />
                                  </div>
                                  <div className="flex flex-row items-center gap-5">
                                    <div className="truncate text-lg font-semibold">
                                      {member.name}
                                    </div>
                                    {member.isAdmin ? (
                                      <div
                                        className={
                                          theme.type === "dark"
                                            ? "flex flex-row rounded-lg bg-gray-700 text-xs font-semibold"
                                            : "flex flex-row rounded-lg bg-gray-300 text-xs font-semibold"
                                        }
                                      >
                                        <Tool size={13} />
                                        Admin
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="ml-auto">
                                  {mymember?.isAdmin &&
                                  member.userId !== myuser.id ? (
                                    <div
                                      className={
                                        theme.type === "dark"
                                          ? "cursor-pointer rounded-lg hover:bg-gray-700"
                                          : "cursor-pointer rounded-lg hover:bg-gray-300"
                                      }
                                    >
                                      <ChevronDown
                                        onClick={() => {
                                          window.history.pushState(
                                            null,
                                            "",
                                            window.location.pathname
                                          );
                                          setShowUserSett(true);
                                          setUserSett(
                                            <ButtonsModal
                                              show={true}
                                              setShow={setShowUserSett}
                                              setLoading={setLoading}
                                              member={member}
                                            />
                                          );
                                        }}
                                        size={30}
                                      />
                                    </div>
                                  ) : (
                                    <ChevronRight />
                                  )}
                                </div>
                              </div>
                            </Card>
                          </div>
                        )
                      )}
                    </div>
                  </Collapse>
                ) : null}
                <Collapse title="Media">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-wrap gap-2">
                      {media?.media.reverse().map((link, i) =>
                        i < limit ? (
                          imgformats.includes(
                            link.slice(link.length - 4, link.length)
                          ) ? (
                            <ImageBg
                              className="h-20 w-20 cursor-pointer"
                              onClick={() => {
                                setSelectMedia([link]);
                                window.history.pushState(
                                  null,
                                  "",
                                  window.location.pathname
                                );
                                setShowMediaViewer(true);
                              }}
                              src={link}
                              width={100}
                              height={100}
                              style={{ objectFit: "cover" }}
                              layout="fixed"
                              alt="Selected Media."
                              key={i}
                            />
                          ) : videoformats.includes(
                              link.slice(link.length - 4, link.length)
                            ) ? (
                            <video
                              onClick={() => {
                                window.history.pushState(
                                  null,
                                  "",
                                  window.location.pathname
                                );
                                setSelectMedia([link]);
                                setShowMediaViewer(true);
                              }}
                              key={i}
                              className="h-20 w-20 cursor-pointer"
                            >
                              <source src={link} key={i} type="video/mp4" />
                              <p>
                                Your browser does not support HTML video. Here
                                is a<a href={link}>link to the video</a>{" "}
                                instead.
                              </p>
                            </video>
                          ) : null
                        ) : null
                      )}
                    </div>
                    <Button onClick={() => setLimit(limit + 20)}>
                      Afișează mai multe
                    </Button>
                  </div>
                </Collapse>
                <Collapse title="Fișiere">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex w-full flex-col justify-end">
                      {media
                        ? media.media.length > 0
                          ? media.media.reverse().map((file, i) =>
                              !imgformats.includes(
                                file.slice(file.length - 4, file.length)
                              ) &&
                              !videoformats.includes(
                                file.slice(file.length - 4, file.length)
                              ) ? (
                                audioformats.includes(
                                  file.slice(file.length - 4, file.length)
                                ) ? (
                                  <div>
                                    <audio
                                      className={
                                        theme.type === "dark"
                                          ? "my-1 h-14 w-full invert"
                                          : "my-1 h-14 w-full"
                                      }
                                      key={i}
                                      controls
                                      src={file}
                                    >
                                      <a href={file}> Download audio </a>
                                    </audio>
                                    <Button
                                      iconRight={<Download />}
                                      auto
                                      onClick={() => {
                                        if (Capacitor.getPlatform() === "web") {
                                          void downloadFile(
                                            file,
                                            file.substring(
                                              file.lastIndexOf("/") + 1
                                            ),
                                            setToast
                                          );
                                        } else
                                          void download(
                                            file,
                                            file.substring(
                                              file.lastIndexOf("/") + 1
                                            ),
                                            setToast
                                          );
                                      }}
                                      px={0.6}
                                      scale={2 / 3}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    key={i}
                                    className={
                                      theme.type === "dark"
                                        ? "my-1 flex w-full flex-row items-center rounded-lg bg-gray-900"
                                        : "my-1 flex w-full flex-row items-center rounded-lg bg-gray-200"
                                    }
                                  >
                                    <File className="ml-2" size={45} />
                                    <div className="my-4 ml-1 truncate text-base">
                                      {file.substring(
                                        file.lastIndexOf("/") + 1
                                      )}
                                    </div>
                                    <Download
                                      className={
                                        theme.type === "dark"
                                          ? "relative right-0 mx-2 ml-auto h-7 w-10 rounded-2xl bg-gray-800 hover:bg-gray-700"
                                          : "relative right-0 mx-2 ml-auto h-7 w-10 rounded-2xl bg-gray-300 hover:bg-gray-400"
                                      }
                                      size={35}
                                      onClick={() => {
                                        if (Capacitor.getPlatform() === "web") {
                                          void downloadFile(
                                            file,
                                            file.substring(
                                              file.lastIndexOf("/") + 1
                                            ),
                                            setToast
                                          );
                                        } else
                                          void download(
                                            file,
                                            file.substring(
                                              file.lastIndexOf("/") + 1
                                            ),
                                            setToast
                                          );
                                      }}
                                    />
                                  </div>
                                )
                              ) : null
                            )
                          : null
                        : null}
                    </div>
                    <Button onClick={() => setLimit(limit + 20)}>
                      Afișează mai multe
                    </Button>
                  </div>
                </Collapse>
              </Collapse.Group>
            </div>
          </div>

          <div className="absolute bottom-16 left-3 z-50">
            {emojiPicker ? (
              <Picker
                data={emojiData}
                onEmojiSelect={(e: emoji) => {
                  if (inputElement.current && cursorPositionStart) {
                    inputElement.current.selectionStart =
                      cursorPositionStart + e.native.length;
                  }

                  addEmoji(e);
                }}
                onClickOutside={() => {
                  emojiPicker ? setPicker(false) : null;
                  cursorPositionStart = undefined;
                  inputElement?.current?.focus();
                }}
              />
            ) : null}
          </div>

          {showUserInfo && otherUser && !theconv.isGroup ? (
            <UserInfoModal
              contact={otherUser.user}
              show={showUserInfo}
              setShow={setInfo}
              page={page}
              session={session}
            />
          ) : userInfo ? (
            <UserInfoModal
              contact={userInfo}
              show={showUserInfo}
              setShow={setInfo}
              page={page}
              session={session}
            />
          ) : null}
          {showUserSettings ? userSettings : null}
          {addMembers && conv ? (
            <AddMembersModal
              showMenu={addMembers}
              setMenu={setAddMembers}
              myUser={myuser}
              conv={conv}
              session={session}
            />
          ) : null}
          {showConfirm ? (
            <Modal visible={showConfirm} onClose={() => setConfirm(false)}>
              <Modal.Content>
                <div className="text-center text-xl ">
                  {conv
                    ? "Ești sigur ca vrei să părăsești " + conv.name + "?"
                    : "Ești sigur ca vrei să părăsești " + theconv.name + "?"}
                </div>
              </Modal.Content>
              <Modal.Action passive onClick={() => setConfirm(false)}>
                Anulare
              </Modal.Action>
              <Modal.Action
                passive
                onClick={() => {
                  if (mymember && conv && !leave.isLoading)
                    leave.mutate({ memberId: mymember.id, convId: conv.id });
                }}
              >
                Da, sunt sigur
              </Modal.Action>
            </Modal>
          ) : null}
          {showBlock ? (
            <Modal visible={showBlock} onClose={() => setBlock(false)}>
              <Modal.Content>
                {mymember ? (
                  conv?.blocked.includes(mymember.id) ? (
                    <div>
                      <div className="text-center text-xl ">
                        {data
                          ? "Ești sigur ca vrei să deblochezi utilizatorul " +
                            data.name +
                            "?"
                          : "Ești sigur ca vrei să deblochezi utilizatorul " +
                            theconv.name +
                            "?"}
                      </div>
                      <div className="text-center text-lg ">
                        Acest utlizator va recăpăta abilitatea de a vă trimite
                        mesaje.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-center text-xl ">
                        {data
                          ? "Ești sigur ca vrei să blochezi utilizatorul " +
                            data.name +
                            "?"
                          : "Ești sigur ca vrei să blochezi utilizatorul " +
                            theconv.name +
                            "?"}
                      </div>
                      <div className="text-center text-lg ">
                        Acest utlizator nu vă va mai putea trimite mesaje, dar
                        grupurile pe care le aveți in comun nu vor fi afectate.
                      </div>
                    </div>
                  )
                ) : null}
              </Modal.Content>
              <Modal.Action passive onClick={() => setBlock(false)}>
                Anulare
              </Modal.Action>
              <Modal.Action
                passive
                onClick={() => {
                  if (mymember && data && !block.isLoading && otherUser)
                    if (conv?.blocked.includes(mymember.id))
                      unblock.mutate({
                        memberId: mymember.id,
                        convId: theconv.id,
                        userId: myuser.id,
                        contactId: otherUser.userId,
                      });
                    else
                      block.mutate({
                        memberId: mymember.id,
                        convId: theconv.id,
                        userId: myuser.id,
                        contactId: otherUser.userId,
                      });
                }}
              >
                {block.isLoading || unblock.isLoading
                  ? "Se incarcă..."
                  : "Da, sunt sigur"}
              </Modal.Action>
            </Modal>
          ) : null}
          {showEditName && conv ? (
            <GroupNameEditModal
              showMenu={showEditName}
              setMenu={setEditName}
              conv={conv}
            />
          ) : null}
          {showChangeIcon && conv ? (
            <GroupIconEditModal
              showMenu={showChangeIcon}
              setMenu={setEditIcon}
              conv={conv}
            />
          ) : null}
          {showEditNicknames && conv && mymember ? (
            <ChangeNicknamesModal
              setMenu={setEditNicknames}
              showMenu={showEditNicknames}
              conv={conv}
              mymember={mymember}
            />
          ) : null}
        </div>
      </div>
      <div>
        {showSearch && conv ? (
          <SearchDm
            conv={conv}
            show={showSearch}
            setShow={setSearch}
            setParent={setShow}
            myuser={myuser}
            setReply={setReply}
            setDm={setDm}
            session={session}
          />
        ) : null}
      </div>
    </div>
  );
}

function adaptSize(text: string | undefined) {
  if (text != null)
    if (text.length >= 26) return "text-lg";
    else return "text-2xl";
}

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
