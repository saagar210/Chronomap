import { useState } from "react";
import { Plus } from "lucide-react";
import { useTrackStore } from "../../stores/track-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { TrackItem } from "./TrackItem";
import { TrackForm } from "./TrackForm";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";

export function TrackManager() {
  const { tracks } = useTrackStore();
  const { createTrack } = useTrackStore();
  const { activeTimelineId } = useTimelineStore();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col">
      {tracks.length === 0 ? (
        <EmptyState
          title="No tracks"
          description="Add a track to organize your events"
          action={
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="inline mr-1" />
              Add Track
            </Button>
          }
        />
      ) : (
        <>
          {tracks.map((track) => (
            <TrackItem key={track.id} track={track} />
          ))}
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(true)}
              className="w-full"
            >
              <Plus size={14} className="inline mr-1" />
              Add Track
            </Button>
          </div>
        </>
      )}

      <TrackForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(name, color) => {
          if (activeTimelineId) {
            createTrack({ timelineId: activeTimelineId, name, color });
          }
        }}
      />
    </div>
  );
}
