import PullToRefresh from '../shared/PullToRefresh';

export default function PublicLayout({ children }) {
  return (
    <PullToRefresh onRefresh={async () => {
      window.location.href = window.location.pathname + '?_hc=' + Date.now();
    }}>
      {children}
    </PullToRefresh>
  );
}
