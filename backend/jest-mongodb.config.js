module.exports = {
    mongodb: {
    // This will download a binary of MongoDB
    version: '6.0.0', 
    },
    autoStart: false,
    instance: {
        // dbName: 'jest', // Removed to allow unique DB names per test suite
    },
};