import {
  Modal,
  Spacer,
  Textarea,
  Text,
  useToasts,
  Input,
  useTheme,
} from "@geist-ui/core";
import { Edit, Emoji } from "@geist-ui/icons";
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

type editgroupnamemodalprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;
  // take: number;
  // setTake: ({ ...props }: any) => void;
  // myUser: User;
  conv: Conversation;
};

let cursorPositionStart: number | undefined;
export default function GroupNameEditModal({
  showMenu,
  setMenu,
  // myUser,
  conv,
}: // take,
// setTake,
editgroupnamemodalprops) {
  const [value, setValue] = useState<string>(conv.name);
  const [emojiPicker, setPicker] = useState(false);
  const inputElement = useRef<HTMLInputElement>(null);
  const utils = api.useContext();
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();
  const theme = useTheme();

  const edit = api.group.changeGroupName.useMutation();

  useEffect(() => {
    if (edit.isSuccess) {
      void utils.chat.getLastMessage.invalidate();
      setLoading(false);
      setMenu(false);
    }
  }, [edit.isSuccess]);

  const changeHandler = () => {
    if (
      value &&
      value != "" &&
      value?.trim().length !== 0 &&
      value !== conv.name
    ) {
      edit.mutate({
        name: value,
        convId: conv.id,
      });
      setLoading(true);
    } else
      setToast({
        text:
          value === conv.name
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
    const newinput =
      value.slice(0, cursorPositionStart) +
      emoji +
      value.slice(cursorPositionStart);
    setValue(newinput);
    if (cursorPositionStart) cursorPositionStart += emoji.length;
  };

  return (
    <Modal visible={showMenu} onClose={() => setMenu(false)}>
      <Modal.Title> Editează numele grupului </Modal.Title>
      <Modal.Content>
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
          <Emoji
            size={26}
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
            placeholder="Please enter a name."
          />
        </div>
      </Modal.Content>
      <Modal.Action
        onClick={() => {
          setMenu(false);
        }}
      >
        <div className="text-gray-300">Închide</div>
      </Modal.Action>
      <Modal.Action
        onClick={() => {
          if (!loading) changeHandler();
        }}
      >
        {!loading ? <Edit size={22} /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Schimbă"}
      </Modal.Action>
    </Modal>
  );
}
