import { redirect } from 'next/navigation';
export default function DealIndex({ params }: { params: { id: string } }) {
  redirect(`/deals/${params.id}/exec`);
}
