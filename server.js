'use strict';

// Load environment variables from .env file
require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Path = require('path');
const routes = require('./src/routes/index');
// Import database configuration
require('./src/config/database');
// Import Firebase configuration
require('./src/config/firebase');

const init = async () => {
    const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
        routes: {
            cors: {
                origin: ['*'],
            },
            files: {
                relativeTo: Path.join(__dirname, 'images')
            }
        }
    });

    // Register plugins
    await server.register(Inert);

    // Register routes
    server.route(routes);

    // Serve static files from public directory (documentation)
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'public'),
                index: ['index.html'],
                listing: false
            }
        }
    });

    // Serve scan images
    server.route({
        method: 'GET',
        path: '/scans/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'images/scans'),
                listing: false
            }
        }
    });

    // Serve conjunctiva images
    server.route({
        method: 'GET',
        path: '/conjunctivas/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'images/conjunctivas'),
                listing: false
            }
        }
    });

    // Serve profile images
    server.route({
        method: 'GET',
        path: '/profiles/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'images/profiles'),
                listing: false
            }
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
