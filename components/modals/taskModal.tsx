import { Modal, Button, Spacer, Text } from "@geist-ui/core";
import {
  Slash,
  Bookmark,
  Icon,
  MessageCircle,
  CheckCircle,
  ArrowRightCircle,
  X,
} from "@geist-ui/icons";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import AvatarWithStatus from "../avatar";
import DirectMessage from "../drawers/directMessage";
import { User, Prisma } from "@prisma/client";
import moment from "moment";
import { api } from "~/utils/api";
import { App as CapacitorApp } from "@capacitor/app";
import { Session } from "next-auth/core/types";
import { getServerAuthSession } from "~/server/auth";

type Task = Prisma.TaskGetPayload<{
  include: { creator: true; carrier: true };
}>;

type TaskModalProps = {
  task: Task;
  show: boolean;
  setShow: ({ ...props }: any) => void;
  setDm: React.Dispatch<React.SetStateAction<React.JSX.Element | null>>;
  setParentState: ({ ...props }: any) => void;
  myUser: User;
  session: Session;
};

export default function TaskModal({
  task,
  show,
  setShow,
  setDm,
  setParentState,
  myUser,
  session,
}: TaskModalProps) {
  const idRef = useRef(task);
  idRef.current = task;
  const { data: theTask } = api.task.getModalTask.useQuery({ id: task.id });

  const Aicon = getStatus(theTask?.status)?.buttons.action.icon;
  const [bookmarked, setBookmarked] = useState(
    idRef.current.bookmarked.includes(myUser?.id) ? true : false
  );
  const [loading, setLoading] = useState<boolean>(false);
  const utils = api.useContext();

  const conv = api.chat.getConv.useMutation();
  const setTask = api.task.updateTask.useMutation();
  const deleteTask = api.task.deleteTask.useMutation();
  const bookmarkTask = api.task.bookmark.useMutation();
  const unBookmarkTask = api.task.unBookmark.useMutation();

  const update = (status: string) => {
    setTask.mutate({
      id: task.id,
      userId: myUser.id,
      status: status,
    });
    setShow(false);
  };

  const deleteHandler = () => {
    deleteTask.mutate({
      id: task.id,
    });
    setShow(false);
  };

  useEffect(() => {
    void utils.task.getBookmarked.invalidate();
  }, [
    setTask.isSuccess,
    deleteTask.isSuccess,
    bookmarkTask.isSuccess,
    unBookmarkTask.isSuccess,
  ]);

  useEffect(() => {
    setBookmarked(idRef.current.bookmarked.includes(myUser?.id) ? true : false);
  }, [task]);

  useEffect(() => {
    setLoading(false);
    if (conv.isSuccess) setShow(false);
    if (conv.data != undefined)
      setDm(
        <DirectMessage
          status={true}
          conv={conv.data}
          setDm={setDm}
          page={"tasks"}
          session={session}
        />
      );
  }, [conv.isSuccess]);

  const sendMsg = () => {
    const contactId = task.carrier ? task.carrier.id : task.creator.id;
    if (session?.user.id !== contactId)
      conv.mutate({
        userId: session?.user.id,
        contactId: contactId,
      });
    setLoading(true);
  };

  const bookmark = () => {
    bookmarkTask.mutate({
      id: idRef.current.id,
      userId: myUser.id,
    });

    setBookmarked(true);
  };

  const unbookmark = () => {
    unBookmarkTask.mutate({
      id: idRef.current.id,
      userId: myUser?.id,
    });

    setBookmarked(false);
  };

  useEffect(() => {
    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        void CapacitorApp.exitApp();
      } else {
        setShow(false);
      }
    });
    // return () => {};
  }, []);

  return (
    <Modal visible={show} onClose={() => setShow(false)}>
      <div className="absolute right-0 top-0 m-4">
        {bookmarked ? (
          <Button
            iconRight={<X scale={0.35} />}
            auto
            px={0.6}
            scale={2 / 3}
            className="absolute right-0 top-0 p-4"
            onClick={() => {
              unbookmark();
            }}
          />
        ) : (
          <Button
            iconRight={<Bookmark scale={0.35} />}
            auto
            px={0.6}
            scale={2 / 3}
            className="absolute right-0 top-0 p-4"
            onClick={() => {
              bookmark();
            }}
          />
        )}
      </div>
      <div className="absolute left-0 top-0 m-4">
        <Button
          iconRight={<Slash scale={0.35} />}
          auto
          px={0.6}
          scale={2 / 3}
          className="absolute left-0 top-0 p-4"
          onClick={() => {
            deleteHandler();
          }}
        />
      </div>
      <Modal.Title>
        <div className="">
          <Text scale={0.2} mb={0} className="m-2" p>
            {theTask?.title}
          </Text>
          <Text font="20px" className="m-2" p>
            {theTask?.departmentName}
          </Text>
        </div>
      </Modal.Title>

      <Modal.Subtitle>
        <div className="flex flex-row">
          <AvatarWithStatus
            contact={theTask?.carrier ? theTask?.carrier : task.creator}
            interactive={true}
            w="40px"
            h="40px"
          />
          <Text scale={0.2} mb={0} className="m-2" p>
            {theTask?.carrier ? theTask?.carrier.name : task.creator.name}
          </Text>
          <Text scale={0.75} mb={0} className="absolute right-0 m-5" p>
            {String(moment(task.dateAdded).startOf("seconds").fromNow())}
          </Text>
        </div>
      </Modal.Subtitle>
      <Modal.Content>
        <div className="flex py-2 ">
          <p>{theTask?.description}</p>
        </div>
      </Modal.Content>
      <Modal.Action passive onClick={() => setShow(false)}>
        Înapoi
      </Modal.Action>
      {(theTask?.carrier?.id !== myUser.id && theTask?.carrierId) ||
      (!theTask?.carrierId && theTask?.creatorId !== myUser.id) ? (
        <Modal.Action
          onClick={() => {
            if (!loading) {
              sendMsg();
            }
          }}
        >
          {!loading ? <MessageCircle /> : null}
          <Spacer w={0.5} inline />
          {loading
            ? "Se încarcă"
            : getStatus(theTask?.status)?.buttons.message.label}
        </Modal.Action>
      ) : null}
      {theTask?.status === "awaiting" || theTask?.carrierId === myUser.id ? (
        <Modal.Action
          onClick={() => {
            if (theTask?.status === "complete") {
              deleteHandler();
            } else {
              update(getStatus(theTask?.status)!.buttons.action.status);
            }
          }}
        >
          {Aicon ? <Aicon /> : null}
          <Spacer w={0.5} inline />
          {getStatus(theTask?.status)?.buttons.action.label}
        </Modal.Action>
      ) : null}
    </Modal>
  );
}

function getStatus(status: string | undefined) {
  if (!status)
    return {
      label: "În așteptare",
      class: "relative bottom-0 right-0 w-2 rounded-sm bg-red-500",
      buttons: {
        message: {
          label: "Trimite mesaj",
        },
        action: {
          label: "Preia",
          icon: ArrowRightCircle,
          status: "in_progress",
        },
      },
    };

  switch (status) {
    case "awaiting":
      return {
        label: "În așteptare",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-red-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
          },
          action: {
            label: "Preia",
            icon: ArrowRightCircle,
            status: "in_progress",
          },
        },
      };
    case "in_progress":
      return {
        label: "În progres",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-yellow-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
            icon: MessageCircle,
          },
          action: {
            label: "Realizat",
            icon: CheckCircle,
            status: "complete",
          },
        },
      };
    case "complete":
      return {
        label: "Realizată",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-emerald-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
            icon: MessageCircle,
            handler: () => {
              <></>;
            },
          },
          action: {
            label: "Sterge",
            icon: Slash,
            status: "complete",
          },
        },
      };

    default:
      break;
  }
}
