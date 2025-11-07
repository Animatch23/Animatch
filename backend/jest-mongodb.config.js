module.exports = {
    mongodb: {
    // This will download a binary of MongoDB
    version: '6.0.0', 
    },
    autoStart: false,
    instance: {
        dbName: 'jest', // The name of the test DB
    },
};