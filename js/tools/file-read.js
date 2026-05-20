const fs = require("fs");
const path = require("path");

async function fileRead(targetPath) {
  try {
    // Proje kök dizini
    const ROOT_DIR = process.cwd();

    // Güvenli tam path oluştur
    const fullPath = path.resolve(ROOT_DIR, targetPath);

    // Path traversal engeli
    if (!fullPath.startsWith(ROOT_DIR)) {
      return {
        success: false,
        error: "Unauthorized path access",
      };
    }

    // Dosya var mı kontrol
    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        error: "File not found",
      };
    }

    // Dosyayı oku
    const content = fs.readFileSync(fullPath, "utf8");

    // Telemetry log
    console.log(
      `[FILE_READ] ${new Date().toISOString()} -> ${targetPath}`
    );

    return {
      success: true,
      path: targetPath,
      content,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  fileRead,
};