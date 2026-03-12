import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { SuccessPoller } from "./SuccessPoller";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect("/");
  }

  let roastId: string;
  let priceType: string;
  let bundleToken: string | undefined;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      redirect("/");
    }

    roastId = session.metadata?.roastId ?? "";
    priceType = session.metadata?.priceType ?? "";
    bundleToken = session.metadata?.bundleToken;

    if (!roastId) {
      redirect("/");
    }
  } catch {
    redirect("/");
  }

  // Set bundle token cookie if this was a bundle purchase
  if (priceType === "bundle" && bundleToken) {
    const cookieStore = await cookies();
    cookieStore.set("bundle_token", bundleToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 31536000, // 1 year
      path: "/",
    });
  }

  return <SuccessPoller roastId={roastId} />;
}
