import InviteSetupForm from './InviteSetupForm';

// Server Component: reads searchParams and passes token as a prop to the client form.
// This pattern avoids useSearchParams() in a Client Component needing a Suspense boundary.
export default function InviteSetupPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <InviteSetupForm token={searchParams.token ?? ''} />;
}
