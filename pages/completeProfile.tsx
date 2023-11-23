import { Button, Input, useTheme, useToasts } from "@geist-ui/core";
import { Check } from "@geist-ui/icons";
import { UseTRPCMutationResult } from "@trpc/react-query/dist/shared/hooks/types";
import { Session } from "next-auth/core/types";
import { BaseSyntheticEvent, ChangeEvent, useEffect, useState } from "react";
import { api } from "~/utils/api";

type completeprops = {
  session: Session;
  myuser: UseTRPCMutationResult<any, any, any, any>;
};

export default function CompleteProfile({ session, myuser }: completeprops) {
  const theme = useTheme();
  const [tagInput, setTagInput] = useState<string | undefined>();
  const [phoneInput, setPhoneInput] = useState<string | undefined>();
  const { setToast } = useToasts();
  // const { data: myUser, isSuccess } = api.user.get.useQuery({
  //   userId: session.user.id,
  // });
  const complete = api.user.completeProfile.useMutation();

  useEffect(() => {
    if (complete.isSuccess) {
      myuser.mutate({ userId: session.user.id });
    }
  }, [complete.isSuccess]);

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center gap-3"
      style={{ background: theme.palette.background }}
    >
      <div className="text-xl">Completați profilul</div>
      <div className="w-96">
        <Input
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setTagInput(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            setTagInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          }}
          value={tagInput}
          width="100%"
          placeholder='ex: "adrian.minune"'
          label="Nume tag:"
        />
      </div>
      <div className="w-96">
        <Input
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setPhoneInput(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            setPhoneInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          }}
          value={phoneInput}
          width="100%"
          placeholder='ex: "0764765285"'
          label="Număr telefon:"
        />
      </div>
      <div>
        <Button
          icon={<Check />}
          auto
          onClick={() => {
            if (tagInput && phoneInput)
              complete.mutate({
                userId: session.user.id,
                tag: tagInput,
                phone: phoneInput,
              });
            else if (!tagInput)
              setToast({
                text: "Vă rugăm completați numele tag-ului.",
                type: "warning",
              });
            else if (!phoneInput)
              setToast({
                text: "Vă rugăm completați numărul de telefon.",
                type: "warning",
              });
          }}
        >
          Completează
        </Button>
      </div>
    </div>
  );
}
