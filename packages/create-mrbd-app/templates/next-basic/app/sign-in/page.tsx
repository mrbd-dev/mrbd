import { GlassesSignIn } from "@/components/glasses-sign-in";
import { WebSignIn } from "@/components/web-sign-in";
import { isOnMetaRayBanDisplay } from "@/lib/mrbd-device";

// Same sign-in demo, two layouts: the glasses get the 600x600 D-pad pairing
// flow, phones and computers get a responsive centered page. Both run the real
// @mrbd/auth flow.
export default async function SignInPage() {
  if (await isOnMetaRayBanDisplay()) {
    return <GlassesSignIn />;
  }

  return <WebSignIn />;
}
