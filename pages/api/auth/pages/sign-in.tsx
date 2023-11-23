import {
  Button,
  Card,
  Divider,
  Input,
  useTheme,
  useToasts,
} from "@geist-ui/core";
import {
  Facebook,
  ArrowLeft,
  BookOpen,
  LogIn,
  UserCheck,
} from "@geist-ui/icons";
import Link from "next/link";
import Google from "public/assets/google.svg";
import DiscordIcon from "public/assets/discord.svg";
import FacebookIcon from "public/assets/facebook.svg";
import { signIn } from "next-auth/react";
// import { GetServerSidePropsContext } from "next";
import { authOptions } from "~/server/auth";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { NextPage } from "next";
import { useState } from "react";
import SignUp from "./sign-up";
// import { GetServerSidePropsContext } from "next";

const SignIn: NextPage = (props): JSX.Element => {
  const theme = useTheme();
  const [register, setRegister] = useState(false);
  const [userInfo, setUserInfo] = useState({ email: "", password: "" });
  const { setToast } = useToasts();

  const handleSubmit = async () => {
    // validate your userinfo

    console.log(userInfo);
    if (
      userInfo.email != "" &&
      userInfo.email.trim().length !== 0 &&
      userInfo.password != "" &&
      userInfo.password.trim().length !== 0
    ) {
      const res = await signIn("credentials", {
        email: userInfo.email,
        password: userInfo.password,
        redirect: false,
      });

      if (res?.error) {
        setToast({
          text: "E-mail sau parolă greșită.",
          type: "error",
        });
      }

      console.log(res);
    }
  };

  if (register) return <SignUp setShow={setRegister} />;
  else
    return (
      <div
        className={
          theme.type === "dark"
            ? "flex min-h-screen w-full items-center justify-center bg-black text-white"
            : "flex min-h-screen w-full items-center justify-center bg-white text-black"
        }
      >
        <div className="flex w-full flex-col gap-2 p-8 md:w-[420px] md:p-0">
          <h3 className="text-3xl font-bold">Bine ai venit!</h3>
          <h4 className="-mt-2 opacity-75">Te rugăm sa te autentifici.</h4>
          <div className="flex flex-col gap-2">
            <Input
              label="E-mail"
              width="100%"
              placeholder="ex: andrei.popescu@gmail.com"
              onChange={({ target }) =>
                setUserInfo({ ...userInfo, email: target.value })
              }
              onKeyUp={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") {
                  void handleSubmit();
                }
              }}
            />
            <Input.Password
              label="Parolă"
              width="100%"
              placeholder="..."
              onChange={({ target }) =>
                setUserInfo({ ...userInfo, password: target.value })
              }
              onKeyUp={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") {
                  void handleSubmit();
                }
              }}
            />
          </div>
          <Button
            icon={<LogIn />}
            className="w-full"
            onClick={() => void handleSubmit()}
          >
            <div className="my-3 text-base">Autentifică</div>
          </Button>
          <div className="relative">
            <Divider>Sau</Divider>
          </div>
          <Button onClick={() => setRegister(true)}>
            <UserCheck />
            <div className="px-2">Înregistrați-vă</div>
          </Button>
          {/*
        <Button onClick={() => void signIn("facebook")}>
          <Image
            src={FacebookIcon} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
            width="40"
            height="40"
            alt="Google Icon"
            className="mr-2 h-7 w-7"
          />
          Continuă cu Facebook
        </Button>
        <Button onClick={() => void signIn("discord")}>
          <Image
            src={DiscordIcon} // eslint-disable-line @typescript-eslint/no-unsafe-assignment
            width="40"
            height="40"
            alt="Google Icon"
            className="mr-2 h-7 w-7"
          />
          Continuă cu Discord
        </Button> */}
        </div>
      </div>
    );
};

export default SignIn;

// export async function getServerSideProps(context: GetServerSidePropsContext) {
//   const session = await getServerSession(context.req, context.res, authOptions);

//   if (session) {
//     return {
//       redirect: {
//         destination: "/dashboard",
//         permanent: false,
//       },
//     };
//   }

//   return { props: { session } };
// }
