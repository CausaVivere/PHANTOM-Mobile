import { Modal, Text, Spacer, Button, useToasts } from "@geist-ui/core";
import AvatarWithStatus from "../avatar";
import { MessageCircle, MinusCircle } from "@geist-ui/icons";
import DirectMessage from "../drawers/directMessage";
import { useEffect, useState } from "react";
import { Conversation, User } from "@prisma/client";
import { api } from "~/utils/api";
import { App as CapacitorApp } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
import { Session } from "next-auth/core/types";

type UserInfoModalProps = {
  contact: User;
  show: boolean;
  setShow: ({ ...props }: any) => void;
  setDm?: ({ ...props }: any) => void;
  page: string;
  session: Session;
};

export default function UserInfoModal({
  contact,
  show,
  setShow,
  setDm,
  page,
  session,
}: UserInfoModalProps) {
  const { data: myUser } = api.user.get.useQuery({
    userId: session?.user.id,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();

  const conv = api.chat.getConv.useMutation();
  const utils = api.useContext();

  useEffect(() => {
    setLoading(false);
    if (conv.isSuccess) setShow(false);
    if (conv.data != undefined)
      if (setDm)
        setDm(
          <DirectMessage
            status={true}
            conv={conv.data}
            setDm={setDm}
            page={page}
            session={session}
          />
        );
    console.log(conv.data);
    // void utils.chat.getConvs.reset();
  }, [conv.isSuccess]);

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

  const sendMsg = () => {
    if (session?.user.id !== contact.id)
      conv.mutate({
        userId: session?.user.id,
        contactId: contact.id,
      });
    setLoading(true);
  };

  return (
    <Modal visible={show} onClose={() => setShow(false)}>
      <Modal.Title className="flex w-full flex-col place-content-center">
        {
          <AvatarWithStatus
            contact={contact}
            interactive={true}
            w="60px"
            h="60px"
          />
        }
        <div className="mx-3">{contact.name}</div>
      </Modal.Title>

      <div className="flex flex-col justify-center"></div>
      <Modal.Content>
        <Text h5>Detalii contact</Text>
        <Text
          onClick={() => {
            void Clipboard.write({
              string: contact.phone_number ? contact.phone_number : "",
            });

            setToast({
              text: "Număr copiat in clipboard.",
              type: "success",
            });
          }}
          className="cursor-pointer"
          p
        >
          Numar telefon: {String(contact.phone_number)}
        </Text>
        <Text
          onClick={() => {
            void Clipboard.write({
              string: contact.email,
            });

            setToast({
              text: "E-mail copiat in clipboard.",
              type: "success",
            });
          }}
          className="cursor-pointer"
          p
        >
          E-mail: {contact.email}
        </Text>
        <Text p>Departament: {contact.departmentName}</Text>
        <Text p>Functie: {contact.role}</Text>
        {/* <Text p>Ultima autentificare: {"Azi"}</Text> */}
      </Modal.Content>
      <Modal.Action passive onClick={() => setShow(false)}>
        Înapoi
      </Modal.Action>

      {setDm ? (
        <Modal.Action
          passive
          onClick={() => {
            if (!loading) sendMsg();
          }}
        >
          {!loading ? <MessageCircle /> : null}
          <Spacer w={0.5} inline />
          {!loading ? "Trimite mesaj" : "Se încarcă"}
        </Modal.Action>
      ) : null}
    </Modal>
  );
}
