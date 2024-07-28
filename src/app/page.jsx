import CHAT from "@/components/chat";
import SIDEBAR from "@/components/sidebar";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-dvh maxh-h-dvh justify-between overflow-hidden">
      <SIDEBAR />
      <CHAT />
    </main>
  );
}
