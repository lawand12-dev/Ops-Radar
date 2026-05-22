import { redirect } from 'next/navigation';

export default function BenchmarksRedirect() {
  redirect('/dashboard/performance?tab=peers');
}
