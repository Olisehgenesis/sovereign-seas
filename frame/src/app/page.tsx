import { Metadata } from "next";
import Demo from "~/components/Demo";
import ErrorBoundary from "~/components/ErrorBoundary";

const appUrl = process.env.NEXT_PUBLIC_URL;

//
// This is the main frame — the one that appears embedded when we share our link.
//
const frame = {
  version: "next",
  // This is the image displayed when sharing the link.
  imageUrl: `${appUrl}/logo.png`,
  // This is the button displayed when sharing the link.
  button: {
    title: "Vote & Support",
    action: {
      type: "launch_frame",
      name: "Vote & Support",
      url: appUrl,
      splashImageUrl: `${appUrl}/celo
      `,
      splashBackgroundColor: "#f7f7f7",
    },
  },
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sov Seas",
    openGraph: {
      title: "Sovseas",
      description: "Support Your Favorite Project On seas!",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Demo title="Sovereign Seas" />
    </ErrorBoundary>
  );
}
