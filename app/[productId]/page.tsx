import { redirect } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  redirect(`/${productId}/campaigns`);
}
