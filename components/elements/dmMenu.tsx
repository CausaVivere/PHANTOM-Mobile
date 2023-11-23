import { Button, useTheme, Text, ButtonGroup } from "@geist-ui/core";
import { Loader, X } from "@geist-ui/icons";
import { Prisma, User } from "@prisma/client";

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

type menuProps = {
  setMenu: ({ ...props }: any) => void;
  setReply: ({ ...props }: any) => void;
  setEdit: ({ ...props }: any) => void;
  setForward: ({ ...props }: any) => void;
  setLoading: ({ ...props }: any) => void;
  loading: boolean;
  blocked: Array<string>;
  msg: Message;
  myuser: User;
  isMe: boolean;
  deleteHandler: () => void;
  hideHandler: () => void;
  replySet?: () => void;
};

export default function DmMenu({
  setMenu,
  setReply,
  loading,
  blocked,
  msg,
  myuser,
  setEdit,
  setForward,
  isMe,
  deleteHandler,
  hideHandler,
  setLoading,
  replySet,
}: menuProps) {
  const theme = useTheme();

  return (
    <div
      style={{ backgroundColor: theme.palette.background }}
      className="absolute bottom-0 z-50 flex h-fit w-full flex-row place-items-center justify-center"
    >
      {loading ? (
        <div className="my-3 flex flex-col items-center">
          <Loader size={32} /> <Text p>Se încarcă...</Text>
        </div>
      ) : (
        <ButtonGroup scale={1.3} className="my-2">
          {!(blocked.length > 0) ? (
            <Button
              scale={1.3}
              onClick={() => {
                setReply(msg.messageId);
                if (replySet) replySet();
                setMenu(null);
              }}
            >
              Reply
            </Button>
          ) : null}
          {msg.from_userId === myuser.id &&
          msg.originalSender === myuser.id &&
          !(blocked.length > 0) ? (
            <Button
              scale={1.3}
              onClick={() => {
                setEdit(true);
                setMenu(null);
              }}
            >
              Edit
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setForward(true);
              setMenu(null);
            }}
            scale={1.3}
          >
            Forward
          </Button>

          <Button
            scale={1.3}
            onClick={() => {
              isMe ? deleteHandler() : hideHandler();
              setLoading(true);
            }}
          >
            {isMe ? "Delete" : "Hide"}
          </Button>
        </ButtonGroup>
      )}
      <div className="relative right-0 top-0 z-30 m-1 ">
        <Button
          iconRight={<X />}
          auto
          onClick={() => {
            setMenu(null);
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div>
    </div>
  );
}
