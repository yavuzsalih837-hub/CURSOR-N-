const open = require("open");

async function browserOpen(url) {
  try {
    console.log(
      `[BROWSER_OPEN] ${new Date().toISOString()} -> ${url}`
    );

    await open(url);

    return {
      success: true,
      opened: url,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  browserOpen,
};