module.exports = {
  webpack: {
    configure: {
      ignoreWarnings: [
        {
          module: /node_modules\/@mediapipe\/tasks-vision/,
          message: /Failed to parse source map/
        }
      ]
    }
  }
}
