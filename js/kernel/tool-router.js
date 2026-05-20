const { webSearch } = require("../tools/web-search");
const { browserOpen } = require("../tools/browser-open");
const { fileRead } = require("../tools/file-read");
const { fileWrite } = require("../tools/file-write");

async function routeTool(task) {
  const lowerTask = task.toLowerCase();

  console.log(
    `[ROUTER] ${new Date().toISOString()} -> ${task}`
  );

  // WEB SEARCH
  if (
    lowerTask.includes("search") ||
    lowerTask.includes("google") ||
    lowerTask.includes("ara")
  ) {
    return await webSearch(task);
  }

  // BROWSER OPEN
  if (
    lowerTask.includes("open") ||
    lowerTask.includes("browser") ||
    lowerTask.includes("site")
  ) {
    return await browserOpen(task.replace("open", "").trim());
  }

  // FILE READ
  if (
    lowerTask.includes("read") ||
    lowerTask.includes("oku")
  ) {
    const parts = task.split(" ");
    const target = parts[parts.length - 1];

    return await fileRead(target);
  }

  // FILE WRITE
  if (
    lowerTask.includes("write") ||
    lowerTask.includes("yaz")
  ) {
    return await fileWrite(
      "agent-output.txt",
      "Jarvis autonomous output"
    );
  }

  return {
    success: false,
    error: "No matching tool",
  };
}

module.exports = {
  routeTool,
};