import MainView from "@/components/MainView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  return <MainView showSavedToast={saved === "1"} />;
}
