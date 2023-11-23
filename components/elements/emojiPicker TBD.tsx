import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import emoji from "../types/emojiType";

type pickerProps = {
  setInput: ({ ...props }: any) => void;
  setPicker: ({ ...props }: any) => void;
  inputValue: string;
  emojiPicker: boolean;
};

export default function EmojiPickerCustom({
  setInput,
  setPicker,
  inputValue,
  emojiPicker,
}: pickerProps) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(e: emoji) => {
        inputValue += e.native;

        setInput(inputValue);
      }}
      onClickOutside={() => {
        emojiPicker ? setPicker(false) : null;
      }}
    />
  );
}
