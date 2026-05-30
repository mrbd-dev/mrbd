import { GlassesHome } from "@/components/glasses-home";
import { WebHome } from "@/components/web-home";
import { isOnMetaRayBanDisplay } from "@/lib/mrbd-device";

// Server-rendered router: the glasses get the focused 600x600 app, while phones
// and computers get an ordinary responsive landing page.
export default async function Home() {
  if (await isOnMetaRayBanDisplay()) {
    return <GlassesHome />;
  }

  return <WebHome />;
}
