import { Button } from "@geist-ui/core";
import React, { Dispatch, SetStateAction, useState } from "react";
import { Moon, Sun } from "@geist-ui/icons";

type themeButtonProps = {
  mode: string;
  setMode: Dispatch<SetStateAction<string>>;
};

export default function ThemeButton({ mode, setMode }: themeButtonProps) {
  const [icon, setIcon] = useState(<Moon />);

  return (
    <div className="absolute right-0 top-0 m-4">
      <Button
        iconRight={icon}
        auto
        onClick={() => {
          if (mode === "dark") {
            setMode("light");
            setIcon(<Sun />);
          } else {
            setMode("dark");
            setIcon(<Moon />);
          }
        }}
        px={0.6}
        scale={2 / 3}
      />
    </div>
  );
}
