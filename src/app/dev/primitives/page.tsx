import { notFound } from "next/navigation";
import { Showcase } from "./sections";

export const dynamic = "force-dynamic";

export default function PrimitivesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
