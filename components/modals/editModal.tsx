import {
  Modal,
  Spacer,
  Textarea,
  Text,
  useToasts,
  useTheme,
  Button,
} from "@geist-ui/core";
import { ArrowLeftCircle, Edit, Emoji } from "@geist-ui/icons";
import { Message, User } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import emoji from "../types/emojiType";

type editmodalprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;
  // take: number;
  // setTake: ({ ...props }: any) => void;
  // myUser: User;
  msg: Message;
};

let cursorPositionStart: number | undefined;
export default function EditModal({
  showMenu,
  setMenu,
  // myUser,
  msg,
}: // take,
// setTake,
editmodalprops) {
  const [value, setValue] = useState<string>(msg.message);
  const [emojiPicker, setPicker] = useState(false);
  const inputElement = useRef<HTMLTextAreaElement>(null);
  const utils = api.useContext();
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();
  const theme = useTheme();

  const edit = api.chat.editMessage.useMutation();

  useEffect(() => {
    if (edit.isSuccess) {
      void utils.chat.getLastMessage.invalidate();
      setLoading(false);
      setMenu(false);
    }
  }, [edit.isSuccess]);

  const editHandler = () => {
    if (value != "" && value.trim().length !== 0) {
      edit.mutate({
        msgId: msg.messageId,
        convId: msg.convId,
        input: value,
      });
      setLoading(true);
    } else
      setToast({
        text: "Mesajul nu poate fi gol.",
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
      <div className="absolute bottom-16 left-3 z-50">
        {emojiPicker ? (
          <div>
            <Button
              iconRight={<ArrowLeftCircle />}
              auto
              onClick={() => {
                setPicker(false);
              }}
              px={0.6}
              scale={1}
            />
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
          </div>
        ) : null}
      </div>
      <Modal.Title>
        <div className={emojiPicker ? "hidden" : ""}>Edit message</div>
      </Modal.Title>
      <Modal.Content>
        <Emoji
          size={26}
          className="relative bottom-2 cursor-pointer"
          onClick={(event) => {
            event.stopPropagation(); // <=== CRITIAL LINE HERE
            setPicker((emojiPicker) => {
              return !emojiPicker;
            });
          }}
        />

        <Textarea
          ref={inputElement}
          width="100%"
          height={emojiPicker ? 24 : 12}
          initialValue={msg.message}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="Please enter a message."
        />
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
          if (!loading) editHandler();
        }}
      >
        {!loading ? <Edit size={22} /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Editează"}
      </Modal.Action>
    </Modal>
  );
}
