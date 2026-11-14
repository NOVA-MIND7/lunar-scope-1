import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" description="That route does not exist in LUNAR SCOPE." />
      <Link to="/" className="btn btn-primary">
        Back to dashboard
      </Link>
    </>
  );
}
