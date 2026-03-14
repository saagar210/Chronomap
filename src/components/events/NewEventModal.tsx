import { useState } from "react";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { useUiStore } from "../../stores/ui-store";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { useToastStore } from "../../stores/toast-store";

interface NewEventModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewEventModal({ open, onClose }: NewEventModalProps) {
  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);
  const tracks = useTrackStore((s) => s.tracks);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  const reset = () => {
    setEventTitle("");
    setEventDate("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventDate.trim()) return;
    if (!activeTimelineId) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Select a timeline first",
      });
      return;
    }
    if (tracks.length === 0) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Add a track before creating events",
      });
      return;
    }

    await useEventStore.getState().createEvent({
      timelineId: activeTimelineId,
      trackId: tracks[0].id,
      title: eventTitle.trim(),
      startDate: eventDate.trim(),
    });
    useCanvasStore.getState().markDirty();
    handleClose();
    useUiStore.getState().closeModal();
  };

  const canCreate =
    Boolean(activeTimelineId) &&
    tracks.length > 0 &&
    eventTitle.trim().length > 0 &&
    eventDate.trim().length > 0;

  return (
    <Modal open={open} onClose={handleClose} title="New Event">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateEvent();
        }}
        className="flex flex-col gap-3"
      >
        <Input
          id="new-event-title"
          label="Title"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
        />
        <Input
          id="new-event-date"
          label="Date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          placeholder="YYYY-MM-DD"
        />
        {tracks.length === 0 && activeTimelineId && (
          <p className="text-xs text-text-muted">
            Add a track first. New events are created on the first available
            track.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!canCreate}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
