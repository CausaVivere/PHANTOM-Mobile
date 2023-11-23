import {
  Avatar,
  Button,
  Divider,
  Modal,
  Progress,
  Slider,
  Spacer,
  Text,
  useTheme,
  useToasts,
} from "@geist-ui/core";
import {
  Camera,
  Check,
  CheckInCircleFill,
  Circle,
  Plus,
  X,
} from "@geist-ui/icons";
import { BaseSyntheticEvent, useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import { HexColorPicker } from "react-colorful";
import moment from "moment";
import { useS3Upload, getImageData } from "next-s3-upload";
import Image from "next/image";
import { App as CapacitorApp } from "@capacitor/app";
import { Session } from "next-auth/core/types";

type settingsprops = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  session: Session;
};
const imgformats = [".gif", ".jpg", ".png", "jpeg"];
export default function ChatSettings({
  show,
  setShow,
  session,
}: settingsprops) {
  const { setToast } = useToasts();
  const [overCard, setOver] = useState(false);
  const [primaryColor, setPrimary] = useState("#aabbcc");
  const [secondaryColor, setSecondary] = useState("#aabbcc");
  const [nameColor, setNameColor] = useState("#aabbcc");
  const [selectedColor, setSelected] = useState("primary");
  const [opacity, setOpacity] = useState<number>();
  const theme = useTheme();
  const utils = api.useContext();
  const [imageUrl, setImageUrl] = useState<string>();
  const [bgUrl, setBgUrl] = useState<string>();
  const [iconfile, setIcon] = useState<File>();
  const [bgfile, setBg] = useState<File>();

  const iconRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const { FileInput, openFileDialog, uploadToS3, files, resetFiles } =
    useS3Upload();

  const bgUpload = useS3Upload();

  const { data: myuser, isSuccess } = api.user.get.useQuery({
    userId: session.user.id,
  });

  useEffect(() => {
    if (myuser) {
      setPrimary(myuser.colors[0]!);
      setSecondary(myuser.colors[1]!);
      setNameColor(myuser.colors[2]!);
    }
  }, [isSuccess]);

  const update = api.user.updateProfile.useMutation();

  useEffect(() => {
    if (update.isSuccess) {
      void utils.user.get.invalidate();

      setShow(false);
    }
  }, [update.isSuccess]);

  const handleFileChange = ({ target }: BaseSyntheticEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const file: File = target.files[0] as File;
    if (
      imgformats.includes(
        file.name.slice(file.name.length - 4, file.name.length)
      )
    ) {
      resetFiles();

      setImageUrl(URL.createObjectURL(file));
      setIcon(file);
    } else
      setToast({
        text: "Formatul nu este supportat.",
        type: "warning",
      });
  };

  const handleBgChange = ({ target }: BaseSyntheticEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const file: File = target.files[0] as File;
    if (
      imgformats.includes(
        file.name.slice(file.name.length - 4, file.name.length)
      )
    ) {
      resetFiles();

      setBgUrl(URL.createObjectURL(file));
      setBg(file);
    } else
      setToast({
        text: "Formatul nu este supportat.",
        type: "warning",
      });
  };

  const handleUpdate = async () => {
    if (myuser && !update.isLoading) {
      let iconurl: string | undefined;
      let urlBg: string | undefined;
      if (iconfile) {
        if (iconfile.size < 10000000) {
          const { url } = await uploadToS3(iconfile);
          setImageUrl(url);
          iconurl = url;
        } else
          return setToast({
            text: "Fotografia de profil trebuie sa aiba maxim 2 MB.",
            type: "warning",
          });
      }
      if (bgfile && bgfile.size > 0) {
        if (bgfile.size < 10000000) {
          const { url } = await uploadToS3(bgfile);
          setBgUrl(url);
          urlBg = url;
        } else
          return setToast({
            text: "Fotografia de fundal trebuie sa aiba maxim 3 MB.",
            type: "warning",
          });
      }

      update.mutate({
        userId: myuser.id,
        colors: [primaryColor, secondaryColor, nameColor],
        image: iconurl,
        bgimage: urlBg,
        opacity: opacity,
      });
    }
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
    <div>
      <div>
        {" "}
        {bgUrl || myuser?.bgImage ? (
          <Image
            className="absolute z-0"
            style={{
              opacity: `${
                opacity !== undefined
                  ? opacity
                  : myuser?.bgOpacity
                  ? myuser?.bgOpacity
                  : 0.5
              }`,
            }}
            src={bgUrl ? bgUrl : myuser?.bgImage ? myuser?.bgImage : ""}
            alt="Chat background image."
            layout="fill"
            objectFit="cover"
            objectPosition="center"
          />
        ) : null}
      </div>
      <div className="z-90">
        <div
          id="title"
          className="z-50 my-2 items-center justify-center text-center text-2xl"
        >
          Setări profil și mesagerie
        </div>
        <Divider />

        <div id="content" className="mx-3 flex flex-col gap-4 py-3">
          <div className="z-10 flex flex-col items-center">
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
              <Avatar
                text={myuser?.name}
                src={imageUrl ? imageUrl : myuser?.icon}
                scale={8}
              />
              <div className="my-1 w-full">
                {files.map((file, index) => (
                  <div key={index} className="py-3">
                    <Progress value={file.progress} />
                  </div>
                ))}
              </div>
              {overCard ? (
                <div className="z-50 flex justify-center">
                  <Text className="absolute top-28 ">Adaugă poză</Text>
                  <Plus size={40} className="absolute top-24 " />
                </div>
              ) : null}
              <div
                className={
                  theme.type === "dark"
                    ? "absolute top-40 z-50 flex justify-center rounded-full bg-black outline outline-1 outline-offset-1 outline-white"
                    : "absolute top-40 z-50 flex justify-center rounded-full bg-white outline outline-1 outline-offset-1 outline-black"
                }
              >
                <Camera size="20" className="m-2" />
              </div>
            </div>
            <div className=" text-center text-2xl"> {myuser?.name} </div>
          </div>
          <Divider />
          <div className="z-10 flex w-full flex-row justify-center gap-1">
            <div
              className={
                theme.type === "dark"
                  ? "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-900 hover:bg-gray-700"
                  : "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-100 hover:bg-gray-400"
              }
              onClick={() => setSelected("primary")}
            >
              {selectedColor === "primary" ? (
                <CheckInCircleFill className="ml-2" size={20} />
              ) : (
                <Circle className="ml-2" size={20} />
              )}
              <Text
                className={
                  selectedColor === "primary"
                    ? "my-2 mr-2 text-sm font-bold"
                    : "my-2 mr-2 text-sm"
                }
              >
                Culoare primară
              </Text>
            </div>
            <div
              className={
                theme.type === "dark"
                  ? "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-900 hover:bg-gray-700"
                  : "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-100 hover:bg-gray-400"
              }
              onClick={() => {
                setSelected("secondary");
              }}
            >
              {selectedColor === "secondary" ? (
                <CheckInCircleFill className="ml-2" size={20} />
              ) : (
                <Circle className="ml-2" size={20} />
              )}
              <Text
                className={
                  selectedColor === "secondary"
                    ? "my-2 mr-2 text-sm font-bold"
                    : "my-2 mr-2 text-sm"
                }
              >
                Culoare secundară
              </Text>
            </div>
            <div
              className={
                theme.type === "dark"
                  ? "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-900 hover:bg-gray-700"
                  : "flex w-fit cursor-pointer flex-row items-center gap-1 rounded-lg bg-gray-100 hover:bg-gray-400"
              }
              onClick={() => setSelected("name")}
            >
              {selectedColor === "name" ? (
                <CheckInCircleFill className="ml-2" size={20} />
              ) : (
                <Circle className="ml-2" size={20} />
              )}
              <Text
                className={
                  selectedColor === "name"
                    ? "my-2 mr-2 text-sm font-bold"
                    : "my-2 mr-2 text-sm"
                }
              >
                Culoare nume
              </Text>
            </div>
          </div>
          <div className="z-10 flex flex-row items-center justify-center gap-7 px-3  py-3">
            <HexColorPicker
              color={
                selectedColor === "primary"
                  ? primaryColor
                  : selectedColor === "secondary"
                  ? secondaryColor
                  : nameColor
              }
              onChange={
                selectedColor === "primary"
                  ? setPrimary
                  : selectedColor === "secondary"
                  ? setSecondary
                  : setNameColor
              }
            />
            <div className="flex flex-col gap-2">
              <div
                style={{
                  color: nameColor,
                }}
                className={
                  theme.type === "dark"
                    ? "rounded-2xl bg-gray-900 text-left text-xs"
                    : "rounded-2xl bg-gray-100 text-left text-xs"
                }
              >
                <div className="m-2">{myuser?.name}</div>
              </div>
              <div
                style={{
                  backgroundImage: `linear-gradient(to right, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
                className={`box-content flex h-fit w-fit flex-col justify-items-end gap-1 rounded-lg box-decoration-slice px-2 text-white`}
              >
                <div className="text-sm">Previzualizare</div>
                <div className=" text-right text-xs text-gray-300">
                  {moment(new Date()).format("LT")}
                </div>
              </div>
            </div>
          </div>
          <Divider />
          <div className="z-10 flex w-full flex-col items-center">
            <div
              className={
                theme.type === "dark"
                  ? "flex w-full flex-row items-center gap-1 rounded-2xl bg-gray-900 text-base"
                  : "flex w-full flex-row items-center gap-1 rounded-2xl bg-gray-100 text-base"
              }
            >
              <Text className="my-3 ml-2">Schimbă imagine fundal :</Text>
              <Button
                className="mx-3"
                onClick={(event) => {
                  event.stopPropagation(); // <=== CRITIAL LINE HERE

                  bgRef?.current?.click();
                }}
              >
                Selectează imagine
              </Button>
            </div>
            <div className="my-1 w-full">
              {bgUpload.files.map((file, index) => (
                <div key={index} className="py-3">
                  <Progress value={file.progress} />
                </div>
              ))}
            </div>
            <div
              className={
                theme.type === "dark"
                  ? "flex w-full flex-row items-center gap-1 rounded-2xl bg-gray-900 text-base"
                  : "flex w-full flex-row items-center gap-1 rounded-2xl bg-gray-100 text-base"
              }
            >
              <Text className="ml-3">Opacitate:</Text>
              <Slider
                className="m-2"
                min={0}
                max={1}
                step={0.1}
                initialValue={myuser?.bgOpacity ? myuser?.bgOpacity : 0.5}
                onChange={(val) => setOpacity(val)}
                width="75%"
              />
            </div>
          </div>

          <input
            style={{ display: "none" }}
            ref={iconRef}
            type="file"
            name="file"
            accept="image/*"
            multiple={false}
            onChange={handleFileChange}
          />
          <input
            style={{ display: "none" }}
            ref={bgRef}
            type="file"
            name="file"
            accept="image/*"
            multiple={false}
            onChange={handleBgChange}
          />
        </div>
        <Spacer h={5} />
        <div
          className={
            theme.type === "dark"
              ? "fixed bottom-0 z-50 flex h-fit w-full items-center justify-center gap-3 bg-gray-900"
              : "fixed bottom-0 z-50 flex h-fit w-full items-center justify-center gap-3 bg-gray-200"
          }
        >
          <div className="z-50 my-1 flex gap-2">
            <Button
              auto
              icon={<X />}
              onClick={() => {
                setShow(false);
              }}
            >
              Închide
            </Button>
          </div>
          <div className="z-50 my-1 flex gap-2">
            <Button
              auto
              type="success"
              ghost
              icon={<Check />}
              onClick={() => {
                void handleUpdate();
              }}
            >
              {update.isLoading ? "Se încarcă..." : "Salvează"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
