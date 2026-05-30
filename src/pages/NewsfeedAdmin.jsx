import { useBotStore } from '../store/botStore';
import NewsfeedPanel from '../components/admin/NewsfeedPanel';

export default function NewsfeedAdmin() {
  const { selectedBotId } = useBotStore();

  if (!selectedBotId) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Select a bot to manage newsfeed posts.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Newsfeed</h1>
      </div>
      <NewsfeedPanel botId={Number(selectedBotId)} />
    </div>
  );
}
