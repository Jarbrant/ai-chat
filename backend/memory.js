let memoryStore = {
  preferences: {
    tone: "direct",
    dislikes: ["generic answers"]
  },
  events: []
};

export async function getMemory() {
  return memoryStore;
}

export async function saveMemory(event) {
  memoryStore.events.push({
    ...event,
    date: new Date().toISOString()
  });
}
