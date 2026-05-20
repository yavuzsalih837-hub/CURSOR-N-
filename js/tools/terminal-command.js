const { exec } = require("child_process");
const path = require("path");

async function terminalCommand(command) {
  return new Promise((resolve) => {
    try {
      const projectRoot = process.cwd();

      // tehlikeli komutlar engel
      const blocked = [
        "rmdir",
        "del /f",
        "format",
        "shutdown",
        "taskkill",
        "reg delete",
      ];

      const lower = command.toLowerCase();

      if (blocked.some((cmd) => lower.includes(cmd))) {
        return resolve({
          success: false,
          error: "Blocked dangerous command",
        });
      }

      console.log(
        `[TERMINAL_COMMAND] ${new Date().toISOString()} -> ${command}`
      );

      exec(
        command,
        {
          cwd: projectRoot,
          timeout: 15000,
        },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({
              success: false,
              error: error.message,
              stderr,
            });
          }

          resolve({
            success: true,
            stdout,
            stderr,
          });
        }
      );
    } catch (err) {
      resolve({
        success: false,
        error: err.message,
      });
    }
  });
}

module.exports = {
  terminalCommand,
};