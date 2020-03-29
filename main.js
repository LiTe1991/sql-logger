'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
const mysql = require('mysql');

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;

// Own variables
let mySqlPool;

/**
 * Starts the adapter instance
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */
function startAdapter(options) {
    // Create the adapter and define its methods
    return adapter = utils.adapter(Object.assign({}, options, {
        name: 'sql-logger',

        // The ready callback is called when databases are connected and adapter received configuration.
        // start here!
        ready: main, // Main method defined below for readability

        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: (callback) => {
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },

        // is called if a subscribed object changes
        objectChange: (id, obj) => {
            if (obj) {
                // The object was changed
                adapter.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
            } else {
                // The object was deleted
                adapter.log.info(`object ${id} deleted`);
            }
        },

        // is called if a subscribed state changes
        stateChange: (id, state) => {
            if (state) {
                // The state was changed
                adapter.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            } else {
                // The state was deleted
                adapter.log.info(`state ${id} deleted`);
            }
        },

        // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
        // requires "common.message" property to be set to true in io-package.json
        message: (obj) => {
            processMessage(obj);
        },
    }));
}

function main() {
    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config option1: ' + adapter.config.hostname);
    adapter.log.info('config option2: ' + adapter.config.port);
    adapter.log.info('config option2: ' + adapter.config.user);
    adapter.log.info('config option2: ' + adapter.config.password);
    adapter.log.info('config option2: ' + adapter.config.database);

    /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
    */
    /*adapter.setObject('testVariable', {
        type: 'state',
        common: {
            name: 'testVariable',
            type: 'boolean',
            role: 'indicator',
            read: true,
            write: true,
        },
        native: {},
    });*/

    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    /*
        setState examples
        you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
    */
    // the variable testVariable is set to true as command (ack=false)
    //adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    //adapter.setState('testVariable', { val: true, ack: true });

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    //adapter.setState('testVariable', { val: true, ack: true, expire: 30 });

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', (res) => {
        adapter.log.info('check user admin pw iobroker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', (res) => {
        adapter.log.info('check group user admin group admin: ' + res);
    });

    runBackgroundTask();
}

function processMessage(msg) {
    adapter.log.info('Message: ' + msg.command);

    if(msg.command === 'checkConnection') {
        checkConnection(msg);
    }
}

function createMySqlPool(config) {
    adapter.log.debug('Create connection to ' + config.hostname + ' on port ' + config.port + ' with user ' + config.user + ' for db ' + config.database);

    mySqlPool = mysql.createPool({
        connectionLimit: 5,
        host: config.hostname,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database
    });
}

function checkConnection(msg) {
    adapter.log.info('Check connection to sql server');

    if(mySqlPool == null) {
        createMySqlPool(msg.message.config);
    }

    mySqlPool.getConnection(function(err, connection) {
        if(err) {
            adapter.log.error('No connection to database: ' + err.message);
            adapter.sendTo(msg.from, msg.command, {resultMessage: 'Es konnte keine Verbindung hergestellt werden.'}, msg.callback);
            return false;
        } else {
            adapter.log.info('SQL Connected');
            adapter.sendTo(msg.from, msg.command, {resultMessage: 'Verbindung konnte erfolgreich hergestellt werden.'}, msg.callback);

            connection.destroy();
        }
    });
}

function test() {
    adapter.log.info('config option1: ' + adapter.config.hostname);
    adapter.log.info('config option2: ' + adapter.config.port);
    adapter.log.info('config option2: ' + adapter.config.user);
    adapter.log.info('config option2: ' + adapter.config.password);
    adapter.log.info('config option2: ' + adapter.config.database);
}

async function runBackgroundTask() {
    setInterval(test, 60000);
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}