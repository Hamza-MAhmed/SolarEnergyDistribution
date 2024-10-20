// config/dbConfig.js
const oracledb = require('oracledb');
oracledb.initOracleClient({ libDir: 'C:\\Users\\abc\\Downloads\\instantclient-basic-windows.x64-19.24.0.0.0dbru\\instantclient_19_24' });  // Replace with your actual path

const dbConfig = {
  user: 'system',
  password: 'imdbsql234',
  connectString: 'localhost/XE'
};

async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

module.exports = { getConnection };
