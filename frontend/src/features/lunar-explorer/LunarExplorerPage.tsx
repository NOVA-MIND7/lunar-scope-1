import { LunarGlobe } from './globe/LunarGlobe';

export default function LunarExplorerPage() {
  return (
    <div className="mx-auto max-w-[1750px] h-[calc(100vh-4.2rem)] flex flex-col overflow-hidden pb-1">
      <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-line shadow-2xl bg-bg">
        <LunarGlobe variant="full" className="h-full w-full" />
      </div>
    </div>
  );
}
