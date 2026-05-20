const axios = require("axios");

async function webSearch(query) {
  try {
    console.log(
      `[WEB_SEARCH] ${new Date().toISOString()} -> ${query}`
    );

    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

    return {
      success: true,
      query,
      url,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  webSearch,
};