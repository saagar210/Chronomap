(function () {
  const DB_KEY = "chronomap:e2e:db";
  const FILES_KEY = "chronomap:e2e:files";
  const SAVED_FILES_KEY = "chronomap:e2e:saved-files";

  const defaultTemplates = [
    {
      id: "tpl-blank",
      name: "Blank Timeline",
      description: "Start from scratch",
      data: JSON.stringify({ tracks: [] }),
      isBuiltin: true,
      createdAt: "2026-01-01 00:00:00",
    },
    {
      id: "tpl-project",
      name: "Project Timeline",
      description: "Milestones, tasks, and reviews",
      data: JSON.stringify({ tracks: ["Milestones", "Tasks", "Reviews"] }),
      isBuiltin: true,
      createdAt: "2026-01-01 00:00:00",
    },
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  function createId(prefix) {
    if (window.crypto && "randomUUID" in window.crypto) {
      return prefix + "-" + window.crypto.randomUUID();
    }
    return prefix + "-" + Math.random().toString(36).slice(2);
  }

  function parseStored(key, fallback) {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }

  function writeStored(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureDb() {
    const current = parseStored(DB_KEY, null);
    if (current) return current;

    const db = {
      timelines: [],
      tracks: [],
      events: [],
      connections: [],
      templates: defaultTemplates,
      settings: {
        theme: "system",
      },
    };
    writeStored(DB_KEY, db);
    return db;
  }

  function saveDb(db) {
    writeStored(DB_KEY, db);
  }

  function ensureFiles() {
    return parseStored(FILES_KEY, {});
  }

  function saveFiles(files) {
    writeStored(FILES_KEY, files);
  }

  function ensureSavedFiles() {
    return parseStored(SAVED_FILES_KEY, {});
  }

  function saveSavedFiles(files) {
    writeStored(SAVED_FILES_KEY, files);
  }

  function findTimelineBundle(db, timelineId) {
    const timeline = db.timelines.find((item) => item.id === timelineId);
    if (!timeline) {
      throw new Error("Timeline not found");
    }
    const tracks = db.tracks.filter((item) => item.timelineId === timelineId);
    const events = db.events.filter((item) => item.timelineId === timelineId);
    const connections = db.connections.filter(
      (item) => item.timelineId === timelineId,
    );

    return { timeline, tracks, events, connections };
  }

  function createTimeline(db, input) {
    const timestamp = now();
    const timeline = {
      id: createId("timeline"),
      title: input.title,
      description: input.description || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.timelines.unshift(timeline);
    saveDb(db);
    return timeline;
  }

  function createTrack(db, input) {
    const sortOrder = db.tracks.filter(
      (item) => item.timelineId === input.timelineId,
    ).length;
    const track = {
      id: createId("track"),
      timelineId: input.timelineId,
      name: input.name,
      color: input.color || "#3b82f6",
      sortOrder,
      visible: true,
      createdAt: now(),
    };
    db.tracks.push(track);
    saveDb(db);
    return track;
  }

  function createEvent(db, input) {
    const timestamp = now();
    const event = {
      id: createId("event"),
      timelineId: input.timelineId,
      trackId: input.trackId,
      title: input.title,
      description: input.description || "",
      startDate: input.startDate,
      endDate: input.endDate || null,
      eventType: input.eventType || "point",
      importance: input.importance ?? 3,
      color: input.color || null,
      icon: input.icon || null,
      imagePath: input.imagePath || null,
      externalLink: input.externalLink || null,
      tags: input.tags || "",
      source: input.source || null,
      aiGenerated: Boolean(input.aiGenerated),
      aiConfidence: input.aiConfidence ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.events.push(event);
    saveDb(db);
    return event;
  }

  function parseCsvLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    values.push(current.trim());
    return values;
  }

  function toSearchResult(event) {
    return {
      eventId: event.id,
      title: event.title,
      snippet: event.description,
      startDate: event.startDate,
      trackId: event.trackId,
    };
  }

  function getFileForExtensions(files, extensions) {
    const paths = Object.keys(files);
    if (!extensions || extensions.length === 0) {
      return paths[0] || null;
    }
    return (
      paths.find((path) =>
        extensions.some((ext) =>
          path.toLowerCase().endsWith("." + ext.toLowerCase()),
        ),
      ) || null
    );
  }

  function buildMarkdown(bundle) {
    return [
      "# " + bundle.timeline.title,
      "",
      ...bundle.events
        .slice()
        .sort((left, right) => left.startDate.localeCompare(right.startDate))
        .map((event) => `- ${event.startDate}: ${event.title}`),
    ].join("\n");
  }

  function importTimelineJson(db, rawData) {
    const parsed = JSON.parse(rawData);

    if (
      parsed.timeline &&
      Array.isArray(parsed.tracks) &&
      Array.isArray(parsed.events)
    ) {
      const timeline = createTimeline(db, {
        title: parsed.timeline.title || "Imported Timeline",
        description: parsed.timeline.description || "",
      });

      const trackIdMap = new Map();
      for (const track of parsed.tracks) {
        const created = createTrack(db, {
          timelineId: timeline.id,
          name: track.name,
          color: track.color,
        });
        trackIdMap.set(track.id, created.id);
      }

      for (const event of parsed.events) {
        createEvent(db, {
          ...event,
          timelineId: timeline.id,
          trackId:
            trackIdMap.get(event.trackId) ||
            db.tracks.find((item) => item.timelineId === timeline.id)?.id,
        });
      }

      return timeline.id;
    }

    const timeline = createTimeline(db, {
      title: parsed.title || "Imported Timeline",
      description: parsed.description || "",
    });
    return timeline.id;
  }

  function createTemplateTimeline(db, templateId, title) {
    const template = db.templates.find((item) => item.id === templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const timeline = createTimeline(db, {
      title,
      description: template.description,
    });
    const payload = JSON.parse(template.data || "{}");
    for (const trackName of payload.tracks || []) {
      createTrack(db, {
        timelineId: timeline.id,
        name: trackName,
      });
    }

    return timeline.id;
  }

  function invoke(cmd, args) {
    const db = ensureDb();
    switch (cmd) {
      case "list_timelines":
        return clone(db.timelines);
      case "create_timeline":
        return clone(createTimeline(db, args.input));
      case "update_timeline": {
        const timeline = db.timelines.find((item) => item.id === args.input.id);
        if (!timeline) throw new Error("Timeline not found");
        if (args.input.title !== undefined) timeline.title = args.input.title;
        if (args.input.description !== undefined) {
          timeline.description = args.input.description;
        }
        timeline.updatedAt = now();
        saveDb(db);
        return clone(timeline);
      }
      case "delete_timeline": {
        db.timelines = db.timelines.filter((item) => item.id !== args.id);
        db.tracks = db.tracks.filter((item) => item.timelineId !== args.id);
        db.events = db.events.filter((item) => item.timelineId !== args.id);
        db.connections = db.connections.filter(
          (item) => item.timelineId !== args.id,
        );
        saveDb(db);
        return null;
      }
      case "list_tracks":
        return clone(
          db.tracks
            .filter((item) => item.timelineId === args.timelineId)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        );
      case "create_track":
        return clone(createTrack(db, args.input));
      case "update_track": {
        const track = db.tracks.find((item) => item.id === args.input.id);
        if (!track) throw new Error("Track not found");
        Object.assign(track, {
          name: args.input.name ?? track.name,
          color: args.input.color ?? track.color,
          visible: args.input.visible ?? track.visible,
        });
        saveDb(db);
        return clone(track);
      }
      case "delete_track": {
        db.tracks = db.tracks.filter((item) => item.id !== args.id);
        db.events = db.events.filter((item) => item.trackId !== args.id);
        saveDb(db);
        return null;
      }
      case "reorder_tracks": {
        args.trackIds.forEach((trackId, index) => {
          const track = db.tracks.find((item) => item.id === trackId);
          if (track) track.sortOrder = index;
        });
        saveDb(db);
        return null;
      }
      case "list_events":
        return clone(
          db.events
            .filter((item) => item.timelineId === args.timelineId)
            .sort((left, right) =>
              left.startDate.localeCompare(right.startDate),
            ),
        );
      case "create_event":
        return clone(createEvent(db, args.input));
      case "update_event": {
        const event = db.events.find((item) => item.id === args.input.id);
        if (!event) throw new Error("Event not found");
        Object.assign(event, args.input, { updatedAt: now() });
        if (event.endDate === undefined) {
          event.endDate = null;
        }
        saveDb(db);
        return clone(event);
      }
      case "delete_event": {
        db.events = db.events.filter((item) => item.id !== args.id);
        db.connections = db.connections.filter(
          (item) =>
            item.sourceEventId !== args.id && item.targetEventId !== args.id,
        );
        saveDb(db);
        return null;
      }
      case "bulk_delete_events": {
        db.events = db.events.filter((item) => !args.ids.includes(item.id));
        saveDb(db);
        return args.ids.length;
      }
      case "bulk_update_events": {
        db.events = db.events.map((item) =>
          args.input.ids.includes(item.id)
            ? { ...item, ...args.input, updatedAt: now() }
            : item,
        );
        saveDb(db);
        return args.input.ids.length;
      }
      case "list_connections":
        return clone(
          db.connections.filter((item) => item.timelineId === args.timelineId),
        );
      case "create_connection": {
        const connection = {
          id: createId("connection"),
          timelineId: args.input.timelineId,
          sourceEventId: args.input.sourceEventId,
          targetEventId: args.input.targetEventId,
          connectionType: args.input.connectionType || "related",
          label: args.input.label || null,
          color: args.input.color || null,
          createdAt: now(),
        };
        db.connections.push(connection);
        saveDb(db);
        return clone(connection);
      }
      case "update_connection": {
        const connection = db.connections.find(
          (item) => item.id === args.input.id,
        );
        if (!connection) throw new Error("Connection not found");
        Object.assign(connection, args.input);
        saveDb(db);
        return clone(connection);
      }
      case "delete_connection":
        db.connections = db.connections.filter((item) => item.id !== args.id);
        saveDb(db);
        return null;
      case "search_events": {
        const query = args.query.trim().toLowerCase();
        if (!query) return [];
        return clone(
          db.events
            .filter((item) => item.timelineId === args.timelineId)
            .filter((item) =>
              [item.title, item.description, item.tags]
                .join(" ")
                .toLowerCase()
                .includes(query),
            )
            .map(toSearchResult),
        );
      }
      case "list_templates":
        return clone(db.templates);
      case "create_from_template":
        return createTemplateTimeline(db, args.templateId, args.title);
      case "save_as_template": {
        const bundle = findTimelineBundle(db, args.timelineId);
        const template = {
          id: createId("template"),
          name: args.name,
          description: args.description,
          data: JSON.stringify({
            tracks: bundle.tracks.map((track) => track.name),
          }),
          isBuiltin: false,
          createdAt: now(),
        };
        db.templates.push(template);
        saveDb(db);
        return clone(template);
      }
      case "delete_template": {
        const template = db.templates.find((item) => item.id === args.id);
        if (!template) throw new Error("Template not found");
        if (template.isBuiltin)
          throw new Error("Built-in templates cannot be deleted");
        db.templates = db.templates.filter((item) => item.id !== args.id);
        saveDb(db);
        return null;
      }
      case "show_save_dialog":
        return "/mock/" + (args.defaultPath || "timeline.txt");
      case "save_file": {
        const files = ensureSavedFiles();
        files[args.path] = args.content;
        saveSavedFiles(files);
        return null;
      }
      case "show_open_dialog": {
        const files = ensureFiles();
        return getFileForExtensions(files, args.filterExtensions);
      }
      case "read_file": {
        const files = ensureFiles();
        if (!(args.path in files)) throw new Error("Mock file not found");
        return files[args.path];
      }
      case "import_json":
        return importTimelineJson(db, args.data);
      case "import_csv": {
        if (!args.columnMapping.title || !args.columnMapping.startDate) {
          throw new Error("CSV mapping requires title and startDate columns");
        }
        const lines = args.csvData.trim().split(/\r?\n/);
        const headers = parseCsvLine(lines[0]);
        const headerIndex = new Map(
          headers.map((header, index) => [header, index]),
        );
        let count = 0;
        for (const line of lines.slice(1)) {
          if (!line.trim()) continue;
          const values = parseCsvLine(line);
          const title = values[headerIndex.get(args.columnMapping.title)];
          const startDate =
            values[headerIndex.get(args.columnMapping.startDate)];
          if (!title || !startDate) continue;
          const track =
            db.tracks.find((item) => item.timelineId === args.timelineId) ||
            createTrack(db, { timelineId: args.timelineId, name: "Imported" });
          createEvent(db, {
            timelineId: args.timelineId,
            trackId: track.id,
            title,
            startDate,
            description: args.columnMapping.description
              ? values[headerIndex.get(args.columnMapping.description)] || ""
              : "",
          });
          count += 1;
        }
        return count;
      }
      case "export_json":
        return JSON.stringify(findTimelineBundle(db, args.timelineId), null, 2);
      case "export_csv": {
        const bundle = findTimelineBundle(db, args.timelineId);
        return [
          "title,startDate,description",
          ...bundle.events.map((event) =>
            [event.title, event.startDate, event.description]
              .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
              .join(","),
          ),
        ].join("\n");
      }
      case "export_markdown":
        return buildMarkdown(findTimelineBundle(db, args.timelineId));
      case "export_svg":
        return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><text x="24" y="48">ChronoMap mock export</text></svg>';
      case "export_pdf":
        return [37, 80, 68, 70];
      case "get_setting":
        return { key: args.key, value: db.settings[args.key] || "" };
      case "update_setting":
        db.settings[args.key] = args.value;
        saveDb(db);
        return { key: args.key, value: args.value };
      case "ai_check_connection":
      case "ai_research_topic":
      case "ai_fill_gaps":
      case "ai_generate_description":
      case "ai_suggest_connections":
      case "ai_fact_check":
      case "ai_chat":
        throw new Error("Ollama not detected");
      default:
        throw new Error("Mock invoke missing for command: " + cmd);
    }
  }

  window.__CHRONOMAP_TEST__ = {
    reset() {
      window.localStorage.removeItem(DB_KEY);
      window.localStorage.removeItem(FILES_KEY);
      window.localStorage.removeItem(SAVED_FILES_KEY);
    },
    seedFile(path, content) {
      const files = ensureFiles();
      files[path] = content;
      saveFiles(files);
    },
    getSavedFiles() {
      return ensureSavedFiles();
    },
  };

  window.__TAURI_INTERNALS__ = {
    invoke(command, args) {
      return Promise.resolve().then(() => invoke(command, args || {}));
    },
    transformCallback() {
      return 1;
    },
  };
})();
