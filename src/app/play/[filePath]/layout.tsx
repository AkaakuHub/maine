import type { Metadata } from "next";

export const generateMetadata = async ({ params }: { params: { filePath: string } }): Promise<Metadata> => {
  let siteName: string = "";

  if (params.filePath) {
    const filename_temp = decodeURIComponent(params.filePath);
    siteName = filename_temp.split("\\")[1];
  }

  return {
    title: siteName,
    openGraph: {
      title: siteName,
      siteName,
      locale: "ja_JP",
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
