import {
  Avatar,
  Input,
  useTheme,
  Text,
  useToasts,
  Button,
  Loading,
} from "@geist-ui/core";
import { ArrowLeftCircle, Camera, Check, Plus } from "@geist-ui/icons";
import { signIn } from "next-auth/react";
import { useS3Upload } from "next-s3-upload";
import { BaseSyntheticEvent, useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";

const imgformats = [".gif", ".jpg", ".png", "jpeg"];

type signupprops = {
  setShow: ({ ...props }: any) => void;
};

export default function SignUp({ setShow }: signupprops) {
  const theme = useTheme();
  const [overCard, setOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    email: "",
    password: "",
    confirm_password: "",
    tag: "",
    name: "",
    phone_number: "",
    icon: "",
  });
  const [iconfile, setIcon] = useState<File>();

  const { FileInput, openFileDialog, uploadToS3, files, resetFiles } =
    useS3Upload();

  const registrer = api.user.create.useMutation();

  const { setToast } = useToasts();
  const iconRef = useRef<HTMLInputElement>(null);

  const handleFileChange = ({ target }: BaseSyntheticEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const file: File = target.files[0] as File;
    if (
      imgformats.includes(
        file.name.slice(file.name.length - 4, file.name.length)
      )
    ) {
      resetFiles();

      setUserInfo({ ...userInfo, icon: URL.createObjectURL(file) });
      setIcon(file);
    } else
      setToast({
        text: "Formatul nu este supportat.",
        type: "warning",
      });
  };

  const handleRegister = async () => {
    if (userInfo.name === "" || userInfo.name.trim().length === 0)
      return setToast({
        text: "Vă rugăm completați numele.",
        type: "warning",
      });
    else if (userInfo.email === "" || userInfo.email.trim().length === 0)
      return setToast({
        text: "Vă rugăm completați e-mail-ul.",
        type: "warning",
      });
    else if (!userInfo.email.includes("@"))
      return setToast({
        text: "Adresa e-mail nu este validă.",
        type: "warning",
      });
    else if (userInfo.tag === "" || userInfo.tag.trim().length === 0)
      return setToast({
        text: "Vă rugăm completați nume tag.",
        type: "warning",
      });
    else if (userInfo.tag.trim().includes(" "))
      return setToast({
        text: "Spațiile libere nu sunt permise in nume tag.",
        type: "warning",
      });
    else if (userInfo.tag.includes("@"))
      return setToast({
        text: "'@' Nu este permis in nume tag.",
        type: "warning",
      });
    else if (userInfo.password === "" || userInfo.password.trim().length === 0)
      return setToast({
        text: "Vă rugăm completați parola.",
        type: "warning",
      });
    else if (
      userInfo.confirm_password === "" ||
      userInfo.confirm_password.trim().length === 0
    )
      return setToast({
        text: "Vă rugăm completați 'confirmă parola'.",
        type: "warning",
      });
    else if (userInfo.confirm_password !== userInfo.password)
      return setToast({
        text: "Parola și confirmarea parolei nu se potrivesc.",
        type: "warning",
      });
    else if (
      userInfo.phone_number === "" ||
      userInfo.phone_number.trim().length === 0
    )
      return setToast({
        text: "Vă rugăm completați numărul de telefon.",
        type: "warning",
      });

    setLoading(true);

    let iconurl: string | undefined;
    if (iconfile) {
      if (iconfile.size < 2000000) {
        const { url } = await uploadToS3(iconfile);
        setUserInfo({ ...userInfo, icon: url });
        iconurl = url;
      } else
        return setToast({
          text: "Fotografia de profil trebuie sa aiba maxim 2 MB.",
          type: "warning",
        });
    }

    registrer.mutate({
      email: userInfo.email.trim(),
      tag: userInfo.tag.trim(),
      password: userInfo.password,
      name: userInfo.name.trim(),
      icon: iconurl,
      phone: userInfo.phone_number.trim(),
    });
  };

  useEffect(() => {
    if (registrer.isSuccess)
      void signIn("credentials", {
        email: userInfo.email,
        password: userInfo.password,
        redirect: false,
      });
    else if (registrer.isError)
      if (
        registrer.error.message.includes(
          "Unique constraint failed on the fields: (`passwordHash`)"
        )
      ) {
        setToast({
          text: "Parolă invalidă , vă rugăm introduceți alta. ",
          type: "warning",
        });

        registrer.reset();
        setLoading(false);
      }
  }, [registrer]);

  return (
    <div
      style={{ backgroundColor: theme.palette.background }}
      className="min-w-screen max-w-screen  mx-auto flex max-h-screen min-h-screen flex-col items-center justify-center gap-2"
    >
      <div className="absolute left-1 top-0 z-50 m-4">
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
      <div className="py-2 text-2xl font-bold">Înregistrare</div>
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
          src={
            userInfo.icon !== ""
              ? userInfo.icon
              : "https://razvan-hotel-app-bucket.s3.eu-central-1.amazonaws.com/phantom-mobile+essentials/logo+(2).png"
          }
          scale={8}
        />

        {overCard ? (
          <div className="z-50 flex justify-center">
            <Text className="absolute top-56 ">Adaugă poză</Text>
            <Plus size={40} className="absolute top-52 " />
          </div>
        ) : null}
        <div
          className={
            theme.type === "dark"
              ? "absolute top-64 z-50 flex justify-center rounded-full bg-black outline outline-1 outline-offset-1 outline-white"
              : "absolute top-64 z-50 flex justify-center rounded-full bg-white outline outline-1 outline-offset-1 outline-black"
          }
        >
          <Camera size="20" className="m-2" />
        </div>
      </div>
      <div className="justify center flex flex-col gap-2">
        <Input
          readOnly={loading}
          label="Nume"
          width="100%"
          placeholder="ex: Popescu Andrei"
          onChange={({ target }) => {
            if (target.value.length <= 50)
              setUserInfo({ ...userInfo, name: target.value });
            else target.value = userInfo.name;
          }}
        />
        <Input
          readOnly={loading}
          label="E-mail"
          width="100%"
          placeholder="ex: andrei.popescu@gmail.com"
          onChange={({ target }) => {
            if (target.value.length <= 65)
              setUserInfo({ ...userInfo, email: target.value });
            else target.value = userInfo.email;
          }}
        />
        <Input
          readOnly={loading}
          onChange={({ target }) => {
            if (target.value.length <= 35)
              setUserInfo({ ...userInfo, tag: target.value });
            else target.value = userInfo.tag;
          }}
          width="100%"
          placeholder='ex: "adrian.minune"'
          label="Nume tag:"
        />
        <Input.Password
          readOnly={loading}
          label="Parolă"
          width="100%"
          placeholder="..."
          onChange={({ target }) => {
            if (target.value.length <= 40)
              setUserInfo({ ...userInfo, password: target.value });
            else target.value = userInfo.password;
          }}
        />
        <Input.Password
          readOnly={loading}
          label="Confirmă Parolă"
          width="100%"
          placeholder="..."
          onChange={({ target }) => {
            if (target.value.length <= 40)
              setUserInfo({ ...userInfo, confirm_password: target.value });
            else target.value = userInfo.confirm_password;
          }}
        />
        <Input
          readOnly={loading}
          onChange={({ target }) => {
            if (target.value.length <= 10)
              setUserInfo({ ...userInfo, phone_number: target.value });
            else target.value = userInfo.phone_number;
          }}
          width="100%"
          placeholder='ex: "0763405872"'
          label="Număr telefon:"
        />
        <input
          style={{ display: "none" }}
          ref={iconRef}
          type="file"
          name="file"
          accept="image/*"
          multiple={false}
          onChange={handleFileChange}
        />
      </div>
      <div className="py-2">
        <Button
          type="secondary"
          ghost
          onClick={() => {
            void handleRegister();
          }}
        >
          {loading ? <Loading>Se încarcă</Loading> : <Check />}
          {loading ? null : <div className="px-2">Înregistrare</div>}
        </Button>
      </div>
    </div>
  );
}
