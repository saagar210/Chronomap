import { useState } from "react";
import { Eye, EyeOff, Pencil, Trash2, GripVertical } from "lucide-react";
import type { Track } from "../../lib/types";
import { useTrackStore } from "../../stores/track-store";
import { IconButton } from "../common/IconButton";
import { TrackForm } from "./TrackForm";

interface TrackItemProps {
  track: Track;
}

export function TrackItem({ track }: TrackItemProps) {
  const { updateTrack, deleteTrack } = useTrackStore();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary group">
        <GripVertical size={12} className="text-text-muted cursor-grab" />
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: track.color }}
        />
        <span className="text-sm flex-1 truncate">{track.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            tooltip={track.visible ? "Hide track" : "Show track"}
            onClick={() =>
              updateTrack({ id: track.id, visible: !track.visible })
            }
          >
            {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </IconButton>
          <IconButton tooltip="Edit track" onClick={() => setEditing(true)}>
            <Pencil size={12} />
          </IconButton>
          <IconButton
            tooltip="Delete track"
            onClick={() => {
              if (confirm("Delete this track and all its events?")) {
                deleteTrack(track.id);
              }
            }}
          >
            <Trash2 size={12} />
          </IconButton>
        </div>
      </div>

      <TrackForm
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={(name, color) =>
          updateTrack({ id: track.id, name, color })
        }
        initialName={track.name}
        initialColor={track.color}
        title="Edit Track"
      />
    </>
  );
}
