const multer = () => ({
  single: () => (req, res, next) => {
    if (req.body && req.body.__mockFilePath) {
      req.file = { path: req.body.__mockFilePath, originalname: "mock-backup.jsonl" };
    }
    next();
  }
});

multer.diskStorage = () => ({
  destination: () => {},
  filename: () => {}
});

multer.memoryStorage = () => ({ _mock: "memory" });

module.exports = multer;
module.exports.default = multer;
