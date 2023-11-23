import {
  Modal,
  Spacer,
  Textarea,
  Text,
  useToasts,
  Input,
  useTheme,
  Avatar,
  Progress,
  Divider,
  Button,
} from "@geist-ui/core";
import { Camera, Edit, Emoji, Plus } from "@geist-ui/icons";
import { Message, Prisma, User } from "@prisma/client";
import { BaseSyntheticEvent, useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";

import { useS3Upload, getImageData } from "next-s3-upload";

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

type editgroupiconmodalprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;

  conv: Conversation;
};

const imgformats = [".gif", ".jpg", ".png", "jpeg"];

export default function GroupIconEditModal({
  showMenu,
  setMenu,

  conv,
}: editgroupiconmodalprops) {
  const utils = api.useContext();
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();
  const theme = useTheme();
  const [overCard, setOver] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(conv.icon);
  const [file, setFile] = useState<File>();

  const iconRef = useRef<HTMLInputElement>(null);

  const { FileInput, openFileDialog, uploadToS3, files, resetFiles } =
    useS3Upload();

  const edit = api.group.changeGroupPhoto.useMutation();

  useEffect(() => {
    if (edit.isSuccess) {
      void utils.chat.getLastMessage.invalidate();
      setLoading(false);
      setMenu(false);
    }
  }, [edit.isSuccess]);

  const changeHandler = async () => {
    if (imageUrl && imageUrl !== "" && imageUrl !== conv.icon && file) {
      if (file.size < 2000000) {
        setLoading(true);
        const { url } = await uploadToS3(file);
        setImageUrl(url);

        edit.mutate({
          image: url,
          convId: conv.id,
        });
      } else
        setToast({
          text: "Imaginea trebuie sa aiba maxim 2 MB.",
          type: "warning",
        });
    } else
      setToast({
        text: file ? "Selectați o imagine nouă." : "Selectați o imagine.",
        type: "warning",
      });
  };

  const handleFileChange = ({ target }: BaseSyntheticEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const file: File = target.files[0] as File;
    if (
      imgformats.includes(
        file.name.slice(file.name.length - 4, file.name.length)
      )
    ) {
      resetFiles();
      // let { url } = await uploadToS3(file);
      setFile(file);

      setImageUrl(URL.createObjectURL(file));
    } else
      setToast({
        text: "Formatul nu este supportat.",
        type: "warning",
      });
  };

  return (
    <Modal visible={showMenu} onClose={() => setMenu(false)}>
      <Modal.Title> Editează fotografia grupului </Modal.Title>
      <Divider />
      <Modal.Content>
        <div className="flex w-full flex-col items-center">
          <div
            onClick={(event) => {
              event.stopPropagation(); // <=== CRITIAL LINE HERE

              iconRef?.current?.click();
            }}
            onMouseEnter={() => {
              setOver(true);
            }}
            onMouseLeave={() => {
              setOver(false);
            }}
            className="cursor-pointer"
          >
            <Avatar src={imageUrl} text={conv.name} scale={20} />
            {overCard ? (
              <div className="z-50 flex justify-center">
                <Text className="absolute top-32 ">Adaugă poză</Text>
                <Plus size={40} className="absolute top-24 " />
              </div>
            ) : null}
            <div
              className={
                theme.type === "dark"
                  ? "absolute left-16 top-64 rounded-full bg-black outline outline-1 outline-offset-2 outline-white"
                  : "absolute left-16 top-64 rounded-full bg-white outline outline-1 outline-offset-2 outline-black"
              }
            >
              <Camera size="42" className="m-2" />
            </div>
          </div>
          <div className="m-4 w-full">
            {files.map((file, index) => (
              <div key={index} className="py-3">
                <Progress value={file.progress} />
              </div>
            ))}
          </div>
        </div>
      </Modal.Content>

      <input
        style={{ display: "none" }}
        ref={iconRef}
        type="file"
        name="file"
        accept="image/*"
        multiple={false}
        onChange={(e) => handleFileChange(e)}
      />
      <Modal.Action
        onClick={() => {
          setMenu(false);
        }}
      >
        <div className="text-gray-300">Închide</div>
      </Modal.Action>
      <Modal.Action
        onClick={() => {
          if (!loading) void changeHandler();
        }}
      >
        {!loading ? <Edit size={22} /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Schimbă"}
      </Modal.Action>
    </Modal>
  );
}
