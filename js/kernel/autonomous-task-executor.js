const { runMultiStepTask } = require("./multi-step");

async function autonomousTaskExecutor(task) {
  console.log(`[AUTO_EXECUTOR] Mission received -> ${task}`);

  const plan = [
    {
      name: "research",
      action: task,
    },
    {
      name: "chain_execution",
      action: task,
    },
  ];

  const results = [];

  for (const step of plan) {
    console.log(`[AUTO_EXECUTOR] Running step -> ${step.name}`);

    const result = await runMultiStepTask(step.action);

    results.push({
      step: step.name,
      result,
    });
  }

  console.log(`[AUTO_EXECUTOR] Mission completed`);

  return {
    success: true,
    task,
    plan,
    results,
    completedAt: new Date().toISOString(),
  };
}

module.exports = {
  autonomousTaskExecutor,
};