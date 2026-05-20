const { routeTool } = require("./tool-router");

async function executeAgentTask(task) {
  console.log(
    `[AGENT] Starting task -> ${task}`
  );

  const result = await routeTool(task);

  console.log(
    `[AGENT] Finished task`
  );

  return {
    task,
    result,
    completedAt: new Date().toISOString(),
  };
}

module.exports = {
  executeAgentTask,
};