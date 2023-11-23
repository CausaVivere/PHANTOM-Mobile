import {
  Button,
  Modal,
  Spacer,
  ToastInput,
  useTheme,
  useToasts,
} from "@geist-ui/core";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  Download,
  X,
} from "@geist-ui/icons";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import Image from "next/image";
import { App as CapacitorApp } from "@capacitor/app";
import { FileDownload } from "capacitor-plugin-filedownload";
import { Capacitor } from "@capacitor/core";

type mediaviewerprops = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  msgMedia: Array<string>;
  convId: string;
};

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", "webm"];

export default function MediaViewer({
  show,
  setShow,
  msgMedia,
  convId,
}: mediaviewerprops) {
  const [index, setIndex] = useState<number | undefined>();
  const { data: mediaUnfiltered, isSuccess } = api.chat.getMedia.useQuery({
    convId: convId,
  });
  const [media, setMedia] = useState<Array<string | undefined>>([]);
  const { setToast } = useToasts();

  const theme = useTheme();

  useEffect(() => {
    if (isSuccess)
      setMedia(
        mediaUnfiltered!.media.filter(
          (file) =>
            (imgformats.includes(file.slice(file.length - 4, file.length)) &&
              !videoformats.includes(
                file.slice(file.length - 4, file.length)
              )) ||
            (!imgformats.includes(file.slice(file.length - 4, file.length)) &&
              videoformats.includes(file.slice(file.length - 4, file.length)))
        )
      );
    if (mediaUnfiltered)
      setIndex(
        mediaUnfiltered.media
          .filter(
            (file) =>
              (imgformats.includes(file.slice(file.length - 4, file.length)) &&
                !videoformats.includes(
                  file.slice(file.length - 4, file.length)
                )) ||
              (!imgformats.includes(file.slice(file.length - 4, file.length)) &&
                videoformats.includes(file.slice(file.length - 4, file.length)))
          )
          .indexOf(msgMedia[0]!)
      );
  }, [mediaUnfiltered, isSuccess]);

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
    <div
      className=" flex h-fit max-h-screen w-fit flex-col overflow-auto"
      style={{ zIndex: 1500, backgroundColor: theme.palette.background }}
    >
      <div className="absolute right-0 top-0 z-50  m-4">
        <Button
          iconRight={<X />}
          auto
          onClick={() => {
            setShow(null);
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div>
      <div className="absolute left-0 top-0 z-50 m-4">
        <Button
          iconRight={<Download />}
          auto
          onClick={() => {
            if (media && media)
              if (Capacitor.getPlatform() === "web") {
                void downloadFile(
                  media[index ? index : 0]!,
                  media[index ? index : 0]!.substring(
                    media[index ? index : 0]!.lastIndexOf("/") + 1
                  ),
                  setToast
                );
              } else
                void download(
                  media[index ? index : 0]!,
                  media[index ? index : 0]!.substring(
                    media[index ? index : 0]!.lastIndexOf("/") + 1
                  ),
                  setToast
                );
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div>
      <div
        style={{ objectFit: "contain" }}
        id="content"
        className="max-w-screen z-40 my-2  flex h-screen max-h-screen w-screen items-center justify-center"
      >
        {media ? (
          media[index!] ? (
            imgformats.includes(
              media[index!]!.slice(
                media[index!]!.length - 4,
                media[index!]!.length
              )!
            ) ? (
              <Image
                fill
                key={media[index!]}
                src={media[index!]!}
                objectFit="contain"
                alt="Media file."
              />
            ) : videoformats.includes(
                media[index!]!.slice(
                  media[index!]!.length - 4,
                  media[index!]!.length
                )!
              ) ? (
              <video
                className="max-w-screen z-40 h-fit max-h-screen w-screen "
                controls
                key={index}
              >
                <source src={media[index!]} type="video/mp4" />
                <p>
                  Your browser does not support HTML video. Here is a
                  <a href={media[index!]}>link to the video</a> instead.
                </p>
              </video>
            ) : null
          ) : null
        ) : null}
      </div>
      <div
        className={
          theme.type === "dark"
            ? "fixed bottom-0 z-50  flex h-fit w-full items-center justify-center gap-3 bg-gray-900"
            : "fixed bottom-0 z-50  flex h-fit w-full items-center justify-center gap-3 bg-gray-200"
        }
      >
        <div className="z-50 flex flex-row gap-3 ">
          <Button
            onClick={() => {
              if (index)
                if (media[index - 1]) {
                  setIndex(index - 1);
                }
            }}
            disabled={index && media[index - 1] ? false : true}
          >
            <ArrowLeftCircle size={25} />
            <div>Anterioara</div>
          </Button>
        </div>
        <div className="my-1 flex flex-row gap-3">
          <Button
            onClick={() => {
              if (media[index! + 1]) {
                setIndex(index! + 1);
              }
            }}
            disabled={media[index! + 1] ? false : true}
          >
            <div>Următoarea</div>
            <ArrowRightCircle size={25} />
          </Button>
        </div>
      </div>
    </div>
  );
}

async function downloadFile(
  url: string,
  filename: string,
  setToast: (toast: ToastInput) => void
) {
  try {
    // Fetch the file
    const response = await fetch(url);
    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(
        `Unable to download file. HTTP status: ${response.status}`
      );
    }

    // Get the Blob data
    const blob = await response.blob();

    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(downloadLink.href);
      document.body.removeChild(downloadLink);
    }, 100);
  } catch (error) {
    console.error("Error downloading the file:", error);
    setToast({
      text: "Descărcare eșuată.",
      type: "error",
    });
  }
}

const download = async (
  url: string,
  filename: string,
  setToast: (toast: ToastInput) => void
) => {
  await FileDownload.download({
    url: url,
    fileName: filename,
    // headers for http request with POST method
    destination: "LIBRARY",
    // only works on Android, deprecated since 1.0.6
    downloadTitle: "downloading",
    // only works on Android, deprecated since 1.0.6
    downloadDescription: "file is downloading",
  })
    .then((res) => {
      console.log(res.path);
      setToast({
        text: "Descărcare reușită.",
        type: "success",
      });
    })
    .catch((err) => {
      console.log(err);
      setToast({
        text: "Descărcare eșuată.",
        type: "error",
      });
    });
};
