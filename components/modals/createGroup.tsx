import {
  Avatar,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Spacer,
  useToasts,
  Text,
  Progress,
  useTheme,
} from "@geist-ui/core";
import { api } from "~/utils/api";
import AvatarWithStatus from "../avatar";
import {
  BaseSyntheticEvent,
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftCircle,
  ArrowRight,
  Camera,
  Checkbox,
  CheckboxFill,
  Emoji,
  Plus,
  UserPlus,
} from "@geist-ui/icons";
import { User } from "@prisma/client";
import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import emoji from "../types/emojiType";
import { useS3Upload, getImageData } from "next-s3-upload";
import { App as CapacitorApp } from "@capacitor/app";
import { Session } from "next-auth/core/types";

type creategroupprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;
  setParent: ({ ...props }: any) => void;
  myUser: User;
  session: Session;
};

const imgformats = [".gif", ".jpg", ".png", "jpeg"];

let inputValue: string | undefined;
export default function CreateGroupModal({
  showMenu,
  setMenu,
  myUser,
  setParent,
  session,
}: creategroupprops) {
  const [input, setInput] = useState<string | undefined>();
  const [groupName, setName] = useState<string | undefined>();
  const [emojiPicker, setPicker] = useState(false);
  const [query, setQuery] = useState<string | undefined>();
  const [nextStep, setNext] = useState(false);
  const [people, setPeople] = useState<Array<User>>([]);
  const [overCard, setOver] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();
  const [imageUrl, setImageUrl] = useState<string>();
  const [file, setFile] = useState<File>();
  const theme = useTheme();

  const iconRef = useRef<HTMLInputElement>(null);

  const { FileInput, openFileDialog, uploadToS3, files, resetFiles } =
    useS3Upload();

  const utils = api.useContext();

  let persons = [...people];
  let index = 0;
  const { data: contacts } = api.agenda.get.useQuery({
    userId: session.user.id,
    input: query,
    limit: 10,
  });
  const createGroup = api.group.create.useMutation();

  useEffect(() => {
    const timeOutId = setTimeout(() => setQuery(input), 300);

    return () => clearTimeout(timeOutId);
  }, [input]);

  const createHandler = async () => {
    if (imageUrl && imageUrl !== "" && file) {
      if (file.size < 2000000) {
        setLoading(true);
        const { url } = await uploadToS3(file);
        setImageUrl(url);

        const theUsers: Array<string> = [];
        if (people && people.length > 0)
          for (let i = 0; i < people.length; i++) {
            theUsers.push(people[i]!.id);
          }
        theUsers.push(myUser.id);

        createGroup.mutate({
          name: groupName!,
          creatorId: myUser.id,
          users: theUsers,
          image: url,
        });
        setLoading(true);
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

      setFile(file);

      setImageUrl(URL.createObjectURL(file));
    } else
      setToast({
        text: "Formatul nu este supportat.",
        type: "warning",
      });
  };

  useEffect(() => {
    if (createGroup.isSuccess) {
      persons = [];
      setPeople([]);
      setLoading(false);
      setParent(false);
      setMenu(false);
    }
  }, [createGroup.isSuccess]);

  useEffect(() => {
    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        void CapacitorApp.exitApp();
      } else {
        setMenu(false);
      }
    });
    // return () => {};
  }, []);

  return (
    <Modal
      visible={showMenu}
      onClose={() => {
        setMenu(false);
        persons = [];
        setPeople([]);
      }}
      className="flex min-h-screen"
    >
      {nextStep ? (
        <div className="absolute left-0 top-0 z-30 m-4">
          <Button
            iconRight={<ArrowLeftCircle />}
            auto
            onClick={() => {
              setNext(false);
            }}
            scale={2 / 3}
            px={0.6}
          />
        </div>
      ) : null}
      {!nextStep ? (
        <div>
          <div className="relative top-0 items-center justify-center text-xl">
            Creează grup
          </div>
          <div className="flex h-full flex-wrap gap-2 overflow-y-scroll px-1 py-1 text-xs">
            {people?.map((contact, i) => (
              <div
                className="flex h-6 flex-col justify-center gap-1 rounded-lg p-2 outline  outline-1 outline-offset-1 outline-gray-500"
                key={i}
              >
                {contact?.name}
              </div>
            ))}
          </div>
          <div>
            <Input
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setInput(e.currentTarget.value);
              }}
              onKeyUp={(e: BaseSyntheticEvent) => {
                setInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
              }}
              value={input}
              width="100%"
              marginTop={1}
              placeholder="Caută"
            />
          </div>
          <Divider className="absolute top-2 w-full" />
        </div>
      ) : null}
      <Modal.Content className="flex w-full flex-col gap-3 overflow-y-scroll">
        {nextStep ? (
          <div className=" flex flex-col items-center">
            <Spacer h={4} />

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
              <Avatar src={imageUrl} text={groupName} scale={10} />
              {overCard ? (
                <div className="z-50 flex justify-center">
                  <Text className="absolute top-36 ">Adaugă poză</Text>
                  <Plus size={24} className="absolute top-32 " />
                </div>
              ) : null}
              <div
                className={
                  theme.type === "dark"
                    ? "absolute left-28 top-52 rounded-full bg-black outline outline-1 outline-offset-2 outline-white"
                    : "absolute left-28 top-52 rounded-full bg-white outline outline-1 outline-offset-2 outline-black"
                }
              >
                <Camera size="26" className="m-2" />
              </div>
            </div>
            <div className="m-4 w-full">
              {files.map((file, index) => (
                <div key={index} className="py-3">
                  <Progress value={file.progress} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setName(e.currentTarget.value);
                }}
                onKeyUp={(e: BaseSyntheticEvent) => {
                  setName(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
                }}
                value={groupName}
                width="100%"
                marginTop={1}
                placeholder="Nume grup"
              />
              <Emoji
                size={26}
                className="relative top-5 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation(); // <=== CRITIAL LINE HERE
                  setPicker((emojiPicker) => {
                    return !emojiPicker;
                  });
                }}
              />
            </div>
            <Spacer h={4} />
          </div>
        ) : null}
        {!nextStep
          ? contacts?.users
              .filter(
                (user) =>
                  user.id !== "system" &&
                  !user.blocked.includes(myUser.id) &&
                  !myUser.blocked.includes(user.id)
              )
              .map((contact, i) => (
                <Card
                  className="cursor-pointer"
                  key={i}
                  onClick={() => {
                    isChecked(persons, contact.id)
                      ? (index = persons.indexOf(
                          findUser(persons, contact.id)!
                        )) && index === 0
                        ? (persons = [])
                        : persons?.splice(index, 1)
                      : persons.push(contact) && setInput("");

                    setPeople(persons);
                  }}
                >
                  <div className="flex flex-row items-center gap-4">
                    <div>
                      {isChecked(persons, contact.id) ? (
                        <CheckboxFill size={32} />
                      ) : (
                        <Checkbox size={32} />
                      )}
                    </div>
                    <div>
                      <AvatarWithStatus
                        contact={contact}
                        interactive={false}
                        w={"40px"}
                        h={"40px"}
                      />
                    </div>
                    <div className="flex w-[70%] flex-col">
                      <div className="text-lg font-semibold">
                        {contact?.name}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
          : null}

        <input
          style={{ display: "none" }}
          ref={iconRef}
          type="file"
          name="file"
          accept="image/*"
          multiple={false}
          onChange={handleFileChange}
        />
      </Modal.Content>
      <Modal.Action
        passive
        onClick={() => {
          setMenu(false);
          persons = [];
          setPeople([]);
        }}
      >
        Închide
      </Modal.Action>
      {nextStep ? (
        <Modal.Action
          onClick={() => {
            groupName && groupName != "" && !loading
              ? void createHandler()
              : setToast({
                  text: loading
                    ? "Se încarcă"
                    : "Va rugam sa scrieti un nume pentru grup.",
                  type: "warning",
                });
          }}
        >
          {!loading ? <UserPlus size={22} /> : null}
          <Spacer w={0.5} inline />
          {loading ? "Se încarcă" : "Creeaza"}
        </Modal.Action>
      ) : (
        <Modal.Action
          onClick={() => {
            people.length > 0
              ? setNext(true)
              : setToast({
                  text: "Nu poti creea un grup de unul singur 💀.",
                  type: "warning",
                });
          }}
        >
          <ArrowRight size={22} />
          <Spacer w={0.5} inline />
          Urmatorul pas
        </Modal.Action>
      )}
      {nextStep ? (
        <div className="absolute bottom-0 left-3 z-50">
          {emojiPicker ? (
            <Picker
              data={emojiData}
              onEmojiSelect={(e: emoji) => {
                inputValue = groupName ? groupName : "";
                inputValue += e.native;

                setName(inputValue);
              }}
              onClickOutside={() => {
                emojiPicker ? setPicker(false) : null;
              }}
            />
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function isChecked(people: Array<User>, userId: string) {
  for (let i = 0; i < people.length; i++) {
    if (people[i]?.id === userId) {
      return true;
    }
  }

  return false;
}

function findUser(people: Array<User>, userId: string) {
  for (let i = 0; i < people.length; i++) {
    if (people[i]?.id === userId) {
      return people[i];
    }
  }

  return null;
}
