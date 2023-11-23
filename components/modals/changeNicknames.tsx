import {
  Modal,
  Spacer,
  Textarea,
  Text,
  useToasts,
  Input,
  useTheme,
  Avatar,
  Button,
  Divider,
} from "@geist-ui/core";
import { Check, Edit, Edit3, Emoji, X } from "@geist-ui/icons";
import { Message, Prisma, User } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import emoji from "../types/emojiType";

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

type editnicknamenamemodalprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;

  mymember: Group_member;
  conv: Conversation;
};

type Group_member = Prisma.Group_memberGetPayload<{
  include: { user: true };
}>;

let cursorPositionStart: number | undefined;
export default function ChangeNicknamesModal({
  showMenu,
  setMenu,
  mymember,
  conv,
}: editnicknamenamemodalprops) {
  const [value, setValue] = useState<string>();
  const [emojiPicker, setPicker] = useState(false);
  const inputElement = useRef<HTMLInputElement>(null);
  const utils = api.useContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<number>();
  const { setToast } = useToasts();
  const theme = useTheme();

  const edit = api.group.changeNickname.useMutation();

  useEffect(() => {
    if (edit.isSuccess) {
      void utils.chat.getLastMessage.invalidate();
      setSelected(undefined);
    }
  }, [edit.isSuccess]);

  const changeHandler = (member: Group_member) => {
    if (
      value &&
      value != "" &&
      value?.trim().length !== 0 &&
      value !== member.name
    ) {
      edit.mutate({
        memberId: member.id,
        myName: mymember.user.name,
        theirName: member.user.name,
        nickname: value,
      });
      setLoading(true);
    } else
      setToast({
        text:
          value === member.name
            ? "Numele nu poate fi lafel."
            : "Numele nu poate fi gol.",
        type: "warning",
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
    const newinput = value
      ? value.slice(0, cursorPositionStart) +
        emoji +
        value.slice(cursorPositionStart)
      : emoji;
    setValue(newinput);
    if (cursorPositionStart) cursorPositionStart += emoji.length;
  };

  return (
    <Modal visible={showMenu} onClose={() => setMenu(false)}>
      <div className="absolute right-0 top-0 z-30 m-4">
        <Button
          iconRight={<X />}
          auto
          onClick={() => {
            setMenu(false);
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div>
      <Modal.Title>Editează porecle</Modal.Title>
      <Modal.Content>
        <Divider />
        <div className="relative z-50">
          {emojiPicker ? (
            <Picker
              data={emojiData}
              theme={theme.type}
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
        <div className="flex flex-row gap-1">
          <div className="flex w-full flex-col gap-3 overflow-y-scroll">
            {conv.members.map((member, i) => (
              <div
                key={i}
                onClick={() => {
                  if (selected !== i) {
                    setSelected(i);
                    setValue(conv.members[i]?.name);
                  }
                }}
                className={
                  theme.type === "dark"
                    ? "outline-offset-3 flex w-full flex-row items-center gap-4 rounded-lg hover:bg-gray-900"
                    : "outline-offset-3 flex w-full flex-row items-center gap-4 rounded-lg hover:bg-gray-100"
                }
              >
                <div className="px-3">
                  <Avatar src={member.user.icon} h="40px" w="40px" />
                </div>

                {selected === i ? (
                  edit.isLoading ? (
                    "Se incarcă..."
                  ) : (
                    <div className="my-2 flex flex-row items-center gap-1">
                      <Emoji
                        size={20}
                        className="my-1 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation(); // <=== CRITIAL LINE HERE
                          setPicker((emojiPicker) => {
                            return !emojiPicker;
                          });
                        }}
                      />
                      <Input
                        ref={inputElement}
                        width="100%"
                        initialValue={conv.name}
                        value={value}
                        onChange={(e) => {
                          setValue(e.target.value);
                        }}
                        onKeyUp={(e: React.KeyboardEvent) => {
                          if (e.key === "Enter" && !edit.isLoading)
                            changeHandler(member);
                        }}
                        placeholder="Please enter a name."
                      />
                    </div>
                  )
                ) : (
                  <div className="my-2 flex flex-col ">
                    <div className="text-sm font-bold"> {member.name} </div>
                    <div className="text-sm"> {member.user.name} </div>
                  </div>
                )}

                {selected === i ? (
                  <div
                    className={
                      theme.type === "dark"
                        ? "absolute right-8 rounded-lg hover:bg-gray-700"
                        : "absolute right-8 rounded-lg hover:bg-gray-300"
                    }
                  >
                    <Check
                      onClick={() => {
                        if (!edit.isLoading) changeHandler(member);
                      }}
                      size={"25px"}
                    />
                  </div>
                ) : (
                  <div className="absolute right-8">
                    <Edit3 size={"25px"} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
}
