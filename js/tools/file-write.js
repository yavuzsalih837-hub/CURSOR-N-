const fs = require("fs");
const path = require("path");

async function fileWrite(targetPath, content) {
  try {
    const projectRoot = process.cwd();

    // Güvenlik kontrolü
    const fullPath = path.resolve(projectRoot, targetPath);

    if (!fullPath.startsWith(projectRoot)) {
      return {
        success: false,
        error: "Path traversal blocked",
      };
    }

    // Klasör oluştur
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Dosyaya yaz
    fs.writeFileSync(fullPath, content, "utf8");

    // Telemetry
    console.log(
      `[FILE_WRITE] ${new Date().toISOString()} -> ${targetPath}`
    );

    return {
      success: true,
      path: targetPath,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  fileWrite,
};