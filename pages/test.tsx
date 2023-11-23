import { Button, Page, Text } from "@geist-ui/core";
import Link from "next/link";

export default function Home() {
  return (
    <Page>
      <Text h1>Test Page</Text>
      <Link href="/">
        <Button>Go to home</Button>
      </Link>
    </Page>
  );
}
